import { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";
import * as Y from "yjs";
import * as AwarenessProtocol from "y-protocols/awareness";
import EventEmitter from "events";
import debug, { Debugger } from "debug";
import { ConnectionStatus } from "@/types/Connection";
import { debounce, defaults } from "lodash";

const DefaultResyncMs = 20000;
const DefaultSaveMs = 2500;

export type SupabaseProviderConfig = {
  /** Name of the Supabase channel to connect to. */
  readonly channel: string;

  /**
   * Callback to save document updates to Supabase.
   * If undefined, document will not be saved.
   * @param diff A YJS document update blob.
   */
  saveDocument?: (diff: Uint8Array) => void | Promise<void>;

  /**
   * Callback to load initial document state from Supabase.
   * If undefined, document will not be loaded (will have empty initial state).
   * @returns A YJS document state blob, or `null` if no data has been saved.
   */
  loadDocument?: () => Uint8Array | null | Promise<Uint8Array | null>;

  /**
   * Whether or not resyncing with peers is enabled.
   * @default true
   */
  resync: boolean;

  /**
   * Whether or not saving the document is enabled.
   * @default true
   */
  save: boolean;

  /**
   * How often the provider should do a complete resync with peers in milliseconds. Must be positive.
   * @default 20000
   */
  readonly resyncInterval: number;

  /**
   * How often to save the document in milliseconds. Must be positive.
   * @default 2500
   */
  readonly saveInterval: number;

  /**
   * Whether or not the provider should log status updates to the console.
   * @default true
   */
  readonly log: boolean;
};

export enum SupabaseProviderEvents {
  /**
   * Fired when the provider status changes.
   * @param provider {@link SupabaseProvider} This provider
   * @param status {@link ConnectionStatus} The current provider status.
   * @param error {@link (Error | undefined)} The associated error, if status is {@link ConnectionStatus.DisconnectedError}
   */
  Status = "status",

  /**
   * Fired when the provider has started or stopped saving persistent state.
   * @param provider {@link SupabaseProvider} This provider
   * @param saving {@link boolean} If `true`, the provider has started saving. If `false`, the provider has finished saving.
   */
  Saving = "saving",
}

enum ChannelEvents {
  Message = "message",
  Awareness = "awareness",
}

type PartialExcept<T, K extends keyof T> = Pick<T, K> & Partial<Omit<T, K>>;
type ProviderConfig = PartialExcept<SupabaseProviderConfig, "channel">;

export class SupabaseProvider extends EventEmitter {
  public readonly config: SupabaseProviderConfig;
  public readonly awareness: AwarenessProtocol.Awareness;
  public get status() {
    return this._status;
  }

  public get saving() {
    return this.saveCounter > 0;
  }

  constructor(private doc: Y.Doc, private supabase: SupabaseClient, config: ProviderConfig) {
    super();
    this.config = this.validateConfig(config);
    this.awareness = new AwarenessProtocol.Awareness(doc);

    this.logger = debug("y-" + doc.clientID);
    this.logger.enabled = this.config.log;
    this.logger(`Creating ${SupabaseProvider.name} for document ${this.doc.guid}`);

    /* Set up resyncInterval */
    this.resync = setInterval(this.sendResyncUpdate.bind(this), this.config.resyncInterval);

    /* Setup debounced save function */
    const debouncedSave = debounce(
      () => this.status === ConnectionStatus.Connected && this.saveDocument(),
      this.config.saveInterval
    );

    this.requestSave = () => {
      if (this.status !== ConnectionStatus.Connected) return;
      if (!this.config.save || !this.config.saveDocument) return;
      const wasSaving = this.saving;
      this.saveCounter++;
      if (wasSaving !== this.saving) this.emit(SupabaseProviderEvents.Saving, this, this.saving);
      debouncedSave();
    };

    /* Register unload handlers */
    this.onUnload = this.onUnload.bind(this);
    if (typeof window !== "undefined") {
      window.addEventListener("beforeunload", this.onUnload);
    } else if (typeof process !== "undefined") {
      process.on("exit", this.onUnload);
    }

    /* Bind to document/awareness callbacks */
    this.onDocumentUpdate = this.onDocumentUpdate.bind(this);
    this.onAwarenessUpdate = this.onAwarenessUpdate.bind(this);
    this.doc.on("update", this.onDocumentUpdate);
    this.awareness.on("update", this.onAwarenessUpdate);

    /* Fire connection event before connecting to channel */
    this._status = ConnectionStatus.Connecting;
    this.emit(SupabaseProviderEvents.Status, this, this.status, undefined);

    /* Connect client */
    this.channel = this.supabase.channel(this.config.channel);
    this.channel
      .on("broadcast", { event: ChannelEvents.Message }, ({ payload }) => {
        this.receiveDocumentUpdate(Uint8Array.from(payload));
      })
      .on("broadcast", { event: ChannelEvents.Awareness }, ({ payload }) => {
        this.receiveAwarenessUpdate(Uint8Array.from(payload));
      })
      .on("presence", { event: "sync" }, () => {
        const state = this.channel!.presenceState();
        const alone = Object.keys(state).length <= 1;
        if (alone !== this.alone) {
          if (alone) this.logger("Client is alone. Suspending realtime updates.");
          else this.logger("Client is no longer alone. Resuming realtime updates.");
        }

        this.alone = alone;

        /* If we're not alone and we received a presence update, then somebody new has joined.
         * We should send them the current state of the document in case our local changes haven't been saved */
        if (!this.alone) this.sendResyncUpdate();
      })
      .subscribe((status, err) => {
        switch (status) {
          case "SUBSCRIBED":
            this.onSubscribed();
            break;

          case "CHANNEL_ERROR":
            this.destroyInternal(ConnectionStatus.DisconnectedError, err);
            break;

          case "TIMED_OUT":
            this.destroyInternal(ConnectionStatus.DisconnectedError, new Error("Realtime channel timed out."));
            break;
        }
      });
  }

  public async destroy() {
    return this.destroyInternal(ConnectionStatus.Disconnected);
  }

  /* Private methods */
  private _status: ConnectionStatus = ConnectionStatus.Disconnected;
  private logger: Debugger;
  private channel: RealtimeChannel | null = null;
  private resync: NodeJS.Timeout | undefined;
  private previous: Uint8Array | null = null;
  private alone: boolean = true;
  private saveCounter: number = 0; // The number of outstanding document saves
  private requestSave: () => void;

  private validateConfig(config: ProviderConfig): SupabaseProviderConfig {
    const result = defaults(
      { ...config },
      {
        save: true,
        resync: true,
        resyncInterval: DefaultResyncMs,
        saveInterval: DefaultSaveMs,
        log: true
      }
    );

    if (result.resyncInterval <= 0) throw new Error("resyncInterval must be positive");
    if (result.saveInterval <= 0) throw new Error("saveInterval must be positive");

    return result;
  }

  private async destroyInternal(status: ConnectionStatus, error?: any) {
    /* Don't run destruction logic if already destroyed */
    if (this.status === ConnectionStatus.Disconnected || this.status === ConnectionStatus.DisconnectedError) return;
    this._status = ConnectionStatus.Disconnected;

    this.logger(`Destroying ${SupabaseProvider.name} for document ${this.doc.guid}`);
    clearInterval(this.resync);

    /* Remove awareness and unregister unload handlers */
    this.onUnload();
    if (typeof window !== "undefined") {
      window.removeEventListener("beforeunload", this.onUnload);
    } else if (typeof process !== "undefined") {
      process.off("exit", this.onUnload);
    }

    /* Save any outstanding changes to the document */
    await this.saveDocument();

    /* Unbind from document/awareness callbacks */
    this.doc.off("update", this.onDocumentUpdate);
    this.awareness.off("update", this.onAwarenessUpdate);

    /* Remove channel from Supabase if it hasn't been already */
    if (this.channel) {
      const removeChannelSuccess = await this.supabase.removeChannel(this.channel);
      if (removeChannelSuccess !== "ok") {
        status = ConnectionStatus.DisconnectedError;
        error = new Error("Failed to remove the Realtime channel.");
      }
      this.channel = null;
    }

    // Update awareness (keep all users except local)
    const states = Array.from(this.awareness.getStates().keys()).filter((client) => client !== this.doc.clientID);
    AwarenessProtocol.removeAwarenessStates(this.awareness, states, this);

    this._status = status;
    this.emit(SupabaseProviderEvents.Status, this, this.status, error);
  }

  private async onSubscribed() {
    this.logger("Successfully connected to Realtime channel.");
    if (!(await this.loadDocument())) {
      this.logger("Error occured loading document.");
      return;
    }

    /*
     * Track Realtime presence on Supabase channel.
     * If nobody else has joined the room, then we won't send any messages.
     */
    if (!this.channel || (await this.channel.track({})) !== "ok") {
      this.logger("Error occured tracking Realtime presence.");
      return this.destroyInternal(ConnectionStatus.DisconnectedError, new Error("Failed to track Realtime presence"));
    }

    this.logger("Succesfully connected.");
    this._status = ConnectionStatus.Connected;
    this.emit(SupabaseProviderEvents.Status, this, this.status, undefined);
  }

  /**
   * Attempts to the load the document remotely from the database.
   * @returns `true` if loading succeeded, `false` otherwise. Will destroy on failure.
   */
  private async loadDocument() {
    if (!this.config.loadDocument) return true;
    this.logger("Fetching persistent document data...");

    /* Run supplied loading hook, failing if any errors occur */
    try {
      var data = await this.config.loadDocument();
      if (!data) {
        this.logger("No persistent data was retrieved.");
        return true;
      }
    } catch (error: any) {
      this.logger("Error occured while retrieving document data", error);
      await this.destroyInternal(ConnectionStatus.DisconnectedError, error);
      return false;
    }

    /* Attempt to apply data to document */
    this.logger("Retrieved persistent document data. Applying to document...");
    try {
      Y.applyUpdateV2(this.doc, data, this);
      this.previous = Y.encodeStateVector(this.doc);
    } catch (error: any) {
      this.logger("Applying document updates resulted in error", error);
      await this.destroyInternal(ConnectionStatus.DisconnectedError, error);
      return false;
    }

    return true;
  }

  /**
   * Saves the document remotely to the database.
   * This should be debounced to save on database egress.
   */
  private async saveDocument() {
    if (this.saveCounter === 0) return; // Nothing to save
    const outstandingSaves = this.saveCounter;

    /* Called after a successful save. Fires the saving event if needed */
    const onSaved = () => {
      const wasSaving = this.saving;
      this.saveCounter -= outstandingSaves;
      if (this.status === ConnectionStatus.Connected && wasSaving !== this.saving)
        this.emit(SupabaseProviderEvents.Saving, this, this.saving);
    };

    if (!this.config.save || !this.config.saveDocument) return onSaved();

    this.logger("Saving persistent document data...");
    const current = Y.encodeStateAsUpdateV2(this.doc);
    const diff = this.previous ? Y.diffUpdateV2(current, this.previous) : Y.encodeStateAsUpdateV2(this.doc);

    /* This prevents us from saving empty updates */
    if (JSON.stringify([0, 0]) === JSON.stringify(Array.from(diff))) return onSaved();

    /* Save document, failing if errors occur */
    try {
      await this.config.saveDocument(diff);
    } catch (error: any) {
      this.logger("Failed to save persistent document data", error);
      return await this.destroyInternal(ConnectionStatus.DisconnectedError, error);
    }

    this.previous = Y.encodeStateVector(this.doc);
    onSaved();
  }

  /**
   * Sends a document update message to peers.
   * @param message A YJS document update
   */
  private sendDocumentUpdate(message: Uint8Array) {
    if (this.alone) return;
    if (this.status === ConnectionStatus.Connected && this.channel)
      this.channel.send({
        type: "broadcast",
        event: ChannelEvents.Message,
        payload: Array.from(message),
      });
  }

  /**
   * Receives a document update message from peers and updates the local document state.
   * @param message A YJS document update
   */
  private receiveDocumentUpdate(message: Uint8Array) {
    try {
      Y.applyUpdate(this.doc, message, this);
    } catch (err: any) {
      this.logger("Error applying remote document update", err);
    }
  }

  /**
   * Sends an awareness update message to peers.
   * @param message A YJS awareness update
   */
  private sendAwarenessUpdate(message: Uint8Array) {
    if (this.alone) return;
    if (this.status === ConnectionStatus.Connected && this.channel)
      this.channel.send({
        type: "broadcast",
        event: ChannelEvents.Awareness,
        payload: Array.from(message),
      });
  }

  /**
   * Receives an awareness update message from peers and updates the local awareness state.
   * @param message A YJS awareness update.
   */
  private receiveAwarenessUpdate(message: Uint8Array) {
    try {
      AwarenessProtocol.applyAwarenessUpdate(this.awareness, message, this);
    } catch (error: any) {
      this.logger("Error applying remote awareness update", error);
    }
  }

  /**
   * Sends an update to all peers with the current state of the document.
   * By calling this periodically, we can avoid peers' local document state from diverging.
   */
  private sendResyncUpdate() {
    if (!this.config.resync) return;
    const update = Y.encodeStateAsUpdate(this.doc);
    this.sendDocumentUpdate(update);
  }

  private onDocumentUpdate(update: Uint8Array, origin: any) {
    if (origin === this) return;
    this.sendDocumentUpdate(update);
    this.requestSave();
  }

  private onAwarenessUpdate({ added, updated, removed }: any, origin: any) {
    if (origin === this) return;
    const changedClients = added.concat(updated).concat(removed);
    const awarenessUpdate = AwarenessProtocol.encodeAwarenessUpdate(this.awareness, changedClients);
    this.sendAwarenessUpdate(awarenessUpdate);
  }

  private onUnload() {
    AwarenessProtocol.removeAwarenessStates(this.awareness, [this.doc.clientID], this);
  }
}
