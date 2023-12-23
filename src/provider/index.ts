import { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";
import * as Y from "yjs";
import * as AwarenessProtocol from "y-protocols/awareness";
import EventEmitter from "events";
import debug, { Debugger } from "debug";
import { ConnectionStatus } from "@/types/Connection";
import { debounce } from "lodash";

export type SupabaseProviderConfig = {
  /** Name of the Supabase channel to connect to. */
  channel: string;

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
   * How often the provider should do a complete resync with peers in milliseconds.
   * Set to 0 or `false` to disable. Defaults to 20,000 ms.
   */
  resyncInterval?: number | false;

  /**
   * How often to save the document to the database in milliseconds.
   * Set to 0 or `false` to disable. Defaults to 5,000 ms.
   */
  saveInterval?: number | false;
};

export enum SupabaseProviderEvents {
  /**
   * Fired when the provider status changes.
   * @param provider {@link SupabaseProvider} This provider
   * @param status {@link ConnectionStatus} The current provider status.
   * @param error {@link (Error | undefined)} The associated error, if status is {@link ConnectionStatus.DisconnectedError}
   */
  Status = "status",
}

enum ChannelEvents {
  Message = "message",
  Awareness = "awareness",
}

const DefaultResyncMs = 20000;
const DefaultSaveMs = 5000;

export class SupabaseProvider extends EventEmitter {
  public readonly awareness: AwarenessProtocol.Awareness;
  public get status() {
    return this._status;
  }

  constructor(private doc: Y.Doc, private supabase: SupabaseClient, private config: SupabaseProviderConfig) {
    super();
    this.logger = debug("y-" + doc.clientID);
    this.logger.enabled = true;
    this.logger(`Creating ${SupabaseProvider.name} for document ${this.doc.guid}`);
    this.awareness = new AwarenessProtocol.Awareness(doc);

    /* Set up resyncInterval */
    if (this.resyncInterval > 0) this.resync = setInterval(this.sendResyncUpdate.bind(this), this.resyncInterval);

    /* Setup debounced save function */
    this.saveDocumentDebounced = debounce(() => {
      this.saveDocument();
    }, this.config.saveInterval || DefaultSaveMs);

    /* Register unload handlers */
    this.onUnloadBound = this.onUnload.bind(this);
    if (typeof window !== "undefined") {
      window.addEventListener("beforeunload", this.onUnloadBound);
    } else if (typeof process !== "undefined") {
      process.on("exit", this.onUnloadBound);
    }

    /* Bind to document/awareness callbacks */
    this.onDocumentUpdateBound = this.onDocumentUpdate.bind(this);
    this.onAwarenessUpdateBound = this.onAwarenessUpdate.bind(this);
    this.doc.on("update", this.onDocumentUpdateBound);
    this.awareness.on("update", this.onAwarenessUpdateBound);

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
  private saveDocumentDebounced: () => void;

  private onUnloadBound: typeof this.onUnload;
  private onDocumentUpdateBound: typeof this.onDocumentUpdate;
  private onAwarenessUpdateBound: typeof this.onAwarenessUpdate;

  private get resyncInterval(): number {
    if (this.config.resyncInterval === undefined) return DefaultResyncMs;
    return this.config.resyncInterval || 0;
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
      window.removeEventListener("beforeunload", this.onUnloadBound);
    } else if (typeof process !== "undefined") {
      process.off("exit", this.onUnloadBound);
    }

    /* Unbind from document/awareness callbacks */
    this.doc.off("update", this.onDocumentUpdateBound);
    this.awareness.off("update", this.onAwarenessUpdateBound);

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
    await this.loadDocument();

    /*
     * Track Realtime presence on Supabase channel.
     * If nobody else has joined the room, then we won't send any messages.
     */
    if ((await this.channel!.track({})) !== "ok") {
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
    if (this.status !== ConnectionStatus.Connected) return;
    if (this.config.saveInterval === 0 || this.config.saveInterval === false) return;
    if (!this.config.saveDocument) return;
    this.logger("Saving persistent document data...");
    const current = Y.encodeStateAsUpdateV2(this.doc);
    const diff = this.previous ? Y.diffUpdateV2(current, this.previous) : Y.encodeStateAsUpdateV2(this.doc);

    /* This prevents us from saving empty updates */
    if (JSON.stringify([0, 0]) === JSON.stringify(Array.from(diff))) return;

    /* Save document, failing if errors occur */
    try {
      await this.config.saveDocument(diff);
    } catch (error: any) {
      this.logger("Failed to save persistent document data", error);
      return await this.destroyInternal(ConnectionStatus.DisconnectedError, error);
    }

    this.previous = Y.encodeStateVector(this.doc);
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
    const update = Y.encodeStateAsUpdate(this.doc);
    this.sendDocumentUpdate(update);
  }

  private onDocumentUpdate(update: Uint8Array, origin: any) {
    if (origin === this) return;
    this.sendDocumentUpdate(update);
    this.saveDocumentDebounced();
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
