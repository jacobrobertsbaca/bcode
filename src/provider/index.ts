import { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";
import * as Y from "yjs";
import * as AwarenessProtocol from "y-protocols/awareness";
import EventEmitter from "events";
import debug, { Debugger } from "debug";
import { ConnectionStatus } from "@/types/Connection";
import { debounce, defaults, throttle, uniq } from "lodash";
import { z } from "zod";
import { ChannelEvents } from "./events";

const DefaultResyncMs = 20000;
const DefaultSaveMs = 2500;

export enum ReadWriteMode {
  /**
   * Document is read/writable. Changes will be propogated to peers.
   */
  ReadWrite,

  /**
   * Document is read only. Changes won't be propogated to peers.
   */
  ReadOnly,
}

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
   * After modifying the document, how much time must pass in milliseconds
   * without making any changes before document updates are saved. In other words, document
   * saves will be debounced by this interval. Must be positive.
   * @default 2500
   */
  readonly saveInterval: number;

  /**
   * Realtime update throttle interval.
   * At most one realtime message will be sent per this time interval in milliseconds.
   * `0` will disable message throttling;
   * @default 0
   */
  readonly throttleInterval: number;

  /**
   * Whether or not the provider should log status updates to the console.
   * @default true
   */
  readonly log: boolean;

  /**
   * The policy for reading/writing to the document.
   */
  rw: ReadWriteMode;
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

type PartialExcept<T, K extends keyof T> = Pick<T, K> & Partial<Omit<T, K>>;
type ProviderConfig = PartialExcept<SupabaseProviderConfig, "channel">;

const ByteArraySchema = z.number().int().min(0).max(255).array().min(1);
const PayloadSchema = z.object({
  document: ByteArraySchema.optional(),
  awareness: ByteArraySchema.optional(),
});

type Payload = z.infer<typeof PayloadSchema>;

export class SupabaseProvider extends EventEmitter {
  public readonly config: SupabaseProviderConfig;
  public readonly awareness: AwarenessProtocol.Awareness;
  public get status() {
    return this._status;
  }

  public get saving() {
    return this.savesOutstanding > 0;
  }

  constructor(private doc: Y.Doc, private supabase: SupabaseClient, config: ProviderConfig) {
    super();
    this.config = this.validateConfig(config);
    this.awareness = new AwarenessProtocol.Awareness(doc);

    this.logger = debug("y-" + doc.clientID);
    this.logger.enabled = this.config.log;
    this.logger(`Creating ${SupabaseProvider.name} for document ${this.doc.guid}`);

    /* Set up resyncInterval */
    this.resync = setInterval(() => this.sendUpdate({ resync: true }), this.config.resyncInterval);

    /* Setup debounced save function */
    this.saveDocument = this.saveDocument.bind(this);
    this.debouncedSave = debounce(this.saveDocument, this.config.saveInterval);

    /* Setup throttled update function */
    this.commitUpdates = this.commitUpdates.bind(this);
    if (this.config.throttleInterval === 0) this.throttledSend = this.commitUpdates;
    else this.throttledSend = throttle(this.commitUpdates, this.config.throttleInterval);

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
      .on("broadcast", { event: ChannelEvents.Update }, ({ payload }) => {
        this.receiveUpdate(payload);
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
        if (!this.alone) {
          this.sendUpdate({ resync: true });
          this.commitUpdates();
        }
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

  private savesOutstanding: number = 0; // The number of outstanding (incomplete) document saves
  private savesUnclaimed: number = 0; // The number of save requests waiting to be serviced
  private debouncedSave: () => void;

  private documentUpdates: Uint8Array[] = [];
  private awarenessUpdates: number[] = [];
  private throttledSend: () => void;

  private validateConfig(config: ProviderConfig): SupabaseProviderConfig {
    const result = defaults(
      { ...config },
      {
        save: true,
        resync: true,
        resyncInterval: DefaultResyncMs,
        saveInterval: DefaultSaveMs,
        throttleInterval: 0,
        log: true,
        rw: ReadWriteMode.ReadWrite,
      }
    );

    if (result.resyncInterval <= 0) throw new Error("resyncInterval must be positive");
    if (result.saveInterval <= 0) throw new Error("saveInterval must be positive");

    return result;
  }

  private async destroyInternal(status: ConnectionStatus, error?: any) {
    /* Don't run destruction logic if already destroyed */
    if (this.status === ConnectionStatus.Disconnected || this.status === ConnectionStatus.DisconnectedError) return;
    this.onUnload();
    this.commitUpdates();
    this._status = ConnectionStatus.Disconnected;

    this.logger(`Destroying ${SupabaseProvider.name} for document ${this.doc.guid}`);
    clearInterval(this.resync);

    /* Remove awareness and unregister unload handlers */
    if (typeof window !== "undefined") {
      window.removeEventListener("beforeunload", this.onUnload);
    } else if (typeof process !== "undefined") {
      process.off("exit", this.onUnload);
    }

    /* Save any outstanding changes to the document */
    await this.saveDocument(false);

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

  private requestSave() {
    if (this.status !== ConnectionStatus.Connected) return;
    if (!this.config.save || !this.config.saveDocument) return;
    const wasSaving = this.saving;
    this.savesOutstanding++;
    this.savesUnclaimed++;
    if (wasSaving !== this.saving) this.emit(SupabaseProviderEvents.Saving, this, this.saving);
    this.debouncedSave();
  }

  /**
   * Saves the document remotely to the database.
   * This should be debounced to save on database egress.
   * @param [requireConnection=true] Whether or not the provider must be connected to save.
   */
  private async saveDocument(requireConnection: boolean = true) {
    if (requireConnection && this.status !== ConnectionStatus.Connected) return;
    if (this.savesUnclaimed === 0) return; // Nothing to save
    const unclaimedSaves = this.savesUnclaimed;
    this.savesUnclaimed = 0;

    /* Called after a successful save. Fires the saving event if needed */
    const onSaved = () => {
      const wasSaving = this.saving;
      this.savesOutstanding -= unclaimedSaves;
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
   * Enqueues updates to send to peers. Updates are batched together and sent as a single message
   * to clients depdening on the `throttleInterval`.
   * @param update An object containing updates to enqueue.
   *  - `document` contains a YJS update blob
   *  - `awareness` contains a list of changed clients.
   *  - Setting `resync` to true will send an update that synchronizes peers' document
   *    state, overwriting `document` and `awareness` if defined.
   */
  private sendUpdate(update: { document?: Uint8Array; awareness?: number[]; resync?: boolean }) {
    if (!update.resync && this.config.rw === ReadWriteMode.ReadOnly) return;
    if (update.resync && !this.config.resync) return;
    if (update.resync) {
      update = {
        document: Y.encodeStateAsUpdate(this.doc),
        awareness: [this.awareness.clientID],
      };
    }

    if (!update.document && (!update.awareness || update.awareness.length === 0)) return;
    if (update.document) this.documentUpdates.push(update.document);
    if (update.awareness) this.awarenessUpdates.push(...update.awareness);
    this.throttledSend();
  }

  /**
   * Sends all enqueued document/awareness updates as one combined Realtime broadcast.
   * If there is nothing to send, does nothing. Enqueue updates with {@link sendUpdate}.
   */
  private commitUpdates() {
    if (this.alone) return;
    if (this.status !== ConnectionStatus.Connected) return;
    if (!this.channel) return;
    if (this.documentUpdates.length === 0 && this.awarenessUpdates.length === 0) return;

    const payload: Payload = {};

    if (this.documentUpdates.length > 0) {
      payload.document = Array.from(Y.mergeUpdates(this.documentUpdates));
      this.documentUpdates.length = 0;
    }

    if (this.awarenessUpdates.length > 0) {
      const clients = uniq(this.awarenessUpdates);
      this.awarenessUpdates.length = 0;
      payload.awareness = Array.from(AwarenessProtocol.encodeAwarenessUpdate(this.awareness, clients));
    }

    this.channel.send({
      type: "broadcast",
      event: ChannelEvents.Update,
      payload,
    });
  }

  /**
   * Receives an update from peers and applies it to the document.
   * Invalid updates are ignored.
   * @param update An update from peers
   */
  private receiveUpdate(update: Payload) {
    const validation = PayloadSchema.safeParse(update);
    if (!validation.success) return;
    update = validation.data;

    try {
      if (update.document) Y.applyUpdate(this.doc, Uint8Array.from(update.document), this);
      if (update.awareness)
        AwarenessProtocol.applyAwarenessUpdate(this.awareness, Uint8Array.from(update.awareness), this);
    } catch (err: any) {
      this.logger("Error applying remote document update", err);
    }
  }

  private onDocumentUpdate(update: Uint8Array, origin: any) {
    if (origin === this) return;
    this.sendUpdate({ document: update });
    this.requestSave();
  }

  private onAwarenessUpdate(
    {
      added,
      updated,
      removed,
    }: {
      added: number[];
      updated: number[];
      removed: number[];
    },
    origin: any
  ) {
    if (origin === this) return;
    const clients = added.concat(updated).concat(removed);
    this.sendUpdate({ awareness: clients });
  }

  private onUnload() {
    AwarenessProtocol.removeAwarenessStates(this.awareness, [this.doc.clientID], "unload");
  }
}
