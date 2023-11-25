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
   * The name of the diff table where document updates will be saved to.
   *
   * This table's schema must be a superset of the following:
   *
   * - `id bigserial primary key`
   * - `channel text not null`
   * - `diff jsonb not null`
   */
  diffTable: string;

  /**
   * The name of the view containing aggregated document updates.
   *
   * The table must be a view on the {@link SupabaseProviderConfig.diffTable} defined as:
   *
   * ```sql
   * create view {diffView} as (
   *  select
   *    diffs.channel,
   *    json_agg(diffs.diff) as diffs
   *  from (
   *    select channel, diff
   *    from {diffTable}
   *    order by id desc
   *  ) diffs
   *  group by channel
   * );
   * ```
   * */
  diffView: string;

  /**
   * How often the provider should do a complete resync with peers. Set to 0 or `false` to disable.
   * Default is 5000ms.
   */
  resyncInterval?: number | false;

  /**
   * How often to save the document to the database. Defaults to 5000ms.
   */
  saveInterval?: number;
};

export enum SupabaseProviderEvents {
  /**
   * Fired when a peer document update has arrived
   * @param update {@link Uint8Array} A YJS document update
   */
  Message = "message",

  /**
   * Fired when a peer awareness update has arrived
   * @param update {@link Uint8Array} A YJS awareness update
   */
  Awareness = "awareness",

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

enum DiffColumns {
  Channel = "channel",
  Diff = "diff",
  Diffs = "diffs",
}

const DefaultResyncMs = 5000;
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
    if (this.config.resyncInterval || typeof this.config.resyncInterval === "undefined") {
      this.resync = setInterval(() => {
        const update = Y.encodeStateAsUpdateV2(this.doc);
        this.emit(SupabaseProviderEvents.Message, update);
      }, this.config.resyncInterval || DefaultResyncMs);
    }

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

    this.on(SupabaseProviderEvents.Message, this.onMessage);
    this.on(SupabaseProviderEvents.Awareness, this.onAwareness);

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
        try {
          Y.applyUpdate(this.doc, Uint8Array.from(payload), this);
        } catch (err: any) {
          this.logger(err);
        }
      })
      .on("broadcast", { event: ChannelEvents.Awareness }, ({ payload }) => {
        AwarenessProtocol.applyAwarenessUpdate(this.awareness, Uint8Array.from(payload), this);
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
  private saveDocumentDebounced: () => void;

  private onUnloadBound: typeof this.onUnload;
  private onDocumentUpdateBound: typeof this.onDocumentUpdate;
  private onAwarenessUpdateBound: typeof this.onAwarenessUpdate;

  private async destroyInternal(status: ConnectionStatus, error?: any) {
    /* Don't run destruction logic if already destroyed */
    if (this.status === ConnectionStatus.Disconnected || this.status === ConnectionStatus.DisconnectedError)
      return;
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
    this.logger("Loading document data from Supabase database.");
    const { data, error } = await this.supabase
      .from(this.config.diffView)
      .select(DiffColumns.Diffs)
      .eq(DiffColumns.Channel, this.config.channel)
      .maybeSingle();

    if (error) {
      this.logger("Failed to retrieve document data from Supabase", error);
      await this.destroyInternal(ConnectionStatus.DisconnectedError, error);
      return;
    }

    if (data) {
      this.logger("Retrieved data from Supabase.");
      const diffs: number[][] = data[DiffColumns.Diffs];
      try {
        this.logger("Applying data to document.");
        Y.applyUpdateV2(this.doc, Y.mergeUpdatesV2(diffs.map((d) => Uint8Array.from(d))), this);
        this.previous = Y.encodeStateVector(this.doc);
      } catch (error) {
        this.logger("Applying document updates resulted in error", error);
        await this.destroyInternal(ConnectionStatus.DisconnectedError, error);
        return;
      }
    } else {
      this.logger("No data was retrieved from Supabase.");
    }

    this.logger("Succesfully connected.");
    this._status = ConnectionStatus.Connected;
    this.emit(SupabaseProviderEvents.Status, this, this.status, undefined);
  }

  /**
   * Saves the document remotely to the database.
   * This should be debounced to save on database egress.
   */
  private async saveDocument() {
    this.logger("Saving document to Supabase.");
    const current = Y.encodeStateAsUpdateV2(this.doc);
    const diff = this.previous ? Y.diffUpdateV2(current, this.previous) : Y.encodeStateAsUpdateV2(this.doc);
    const content = Array.from(diff);
    if (JSON.stringify([0, 0]) === JSON.stringify(content)) return;

    const record = {
      [DiffColumns.Channel]: this.config.channel,
      [DiffColumns.Diff]: content,
    };

    const { error } = await this.supabase.from(this.config.diffTable).insert(record);

    if (error) {
      this.logger("Failed to save data to Supabase", error);
      await this.destroyInternal(ConnectionStatus.DisconnectedError, error);
      return;
    }

    this.previous = Y.encodeStateVector(this.doc);
  }

  private onMessage(message: Uint8Array) {
    if (this.status === ConnectionStatus.Connected && this.channel)
      this.channel.send({
        type: "broadcast",
        event: ChannelEvents.Message,
        payload: Array.from(message),
      });
  }

  private onAwareness(message: Uint8Array) {
    if (this.status === ConnectionStatus.Connected && this.channel)
      this.channel.send({
        type: "broadcast",
        event: ChannelEvents.Awareness,
        payload: Array.from(message),
      });
  }

  private onDocumentUpdate(update: Uint8Array, origin: any) {
    if (origin === this) return;
    this.emit(SupabaseProviderEvents.Message, update);
    this.saveDocumentDebounced();
  }

  private onAwarenessUpdate({ added, updated, removed }: any, origin: any) {
    if (origin === this) return;
    const changedClients = added.concat(updated).concat(removed);
    const awarenessUpdate = AwarenessProtocol.encodeAwarenessUpdate(this.awareness, changedClients);
    this.emit(SupabaseProviderEvents.Awareness, awarenessUpdate);
  }

  private onUnload() {
    AwarenessProtocol.removeAwarenessStates(this.awareness, [this.doc.clientID], this);
  }
}
