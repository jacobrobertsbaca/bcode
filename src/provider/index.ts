import { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";
import * as Y from "yjs";
import * as AwarenessProtocol from "y-protocols/awareness";
import EventEmitter from "events";
import debug, { Debugger } from "debug";

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
  Connect = "connect",
  Message = "message",
  Awareness = "awareness",
  Error = "error",
  Disconnect = "disconnect",
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

const ResyncDefault = 5000;
const SaveDefault = 5000;

/**
 * Debounces a function.
 * @param func A function to debounce.
 * @param wait A number of milliseconds to wait between function invocations.
 * @returns A new function which will only be called at most once every {@link wait} milliseconds.
 */
function debounce<T extends (...args: any[]) => any>(func: T, wait: number) {
  let timeout: ReturnType<typeof setTimeout> | null;
  return (...args: Parameters<T>): Promise<ReturnType<T>> => {
    const later = () => {
      timeout = null;
      return func(...args);
    };
    clearTimeout(timeout!);
    timeout = setTimeout(later, wait);
    return new Promise((resolve) => {
      if (!timeout) {
        resolve(func(...args));
      }
    });
  };
}

export class SupabaseProvider extends EventEmitter {
  public readonly awareness: AwarenessProtocol.Awareness;

  constructor(
    private doc: Y.Doc,
    private supabase: SupabaseClient,
    private config: SupabaseProviderConfig
  ) {
    super();
    this.logger = debug("y-" + doc.clientID);
    this.logger.enabled = true;
    this.logger(
      `Creating ${SupabaseProvider.name} for document ${this.doc.guid}`
    );

    this.awareness = new AwarenessProtocol.Awareness(doc);

    /* Set up resyncInterval */
    if (
      this.config.resyncInterval ||
      typeof this.config.resyncInterval === "undefined"
    ) {
      this.resync = setInterval(() => {
        const update = Y.encodeStateAsUpdateV2(this.doc);
        this.emit(SupabaseProviderEvents.Message, update);
        if (this.channel) {
          this.channel.send({
            type: "broadcast",
            event: ChannelEvents.Message,
            payload: Array.from(update),
          });
        }
      }, this.config.resyncInterval || ResyncDefault);
    }

    /* Register unload handlers */
    if (typeof window !== "undefined") {
      window.addEventListener("beforeunload", this.onUnload);
    } else if (typeof process !== "undefined") {
      process.on("exit", this.onUnload);
    }

    /* Setup debounced save function */
    this.saveDocumentDebounced = debounce(() => {
      this.saveDocument();
    }, this.config.saveInterval || SaveDefault);

    this.on(SupabaseProviderEvents.Connect, this.onConnect);
    this.on(SupabaseProviderEvents.Disconnect, this.onDisconnect);
    this.on(SupabaseProviderEvents.Message, this.onMessage);
    this.on(SupabaseProviderEvents.Awareness, this.onAwareness);

    /* Bind to document/awareness callbacks */
    this.onDocumentUpdateBound = this.onDocumentUpdate.bind(this);
    this.onAwarenessUpdateBound = this.onAwarenessUpdate.bind(this);
    this.doc.on("update", this.onDocumentUpdateBound);
    this.awareness.on("update", this.onAwarenessUpdateBound);

    /* Connect client */
    this.connect();
  }

  public destroy() {
    this.logger(
      `Destroying ${SupabaseProvider.name} for document ${this.doc.guid}`
    );
    clearInterval(this.resync);

    /* Unregister unload handlers */
    if (typeof window !== "undefined") {
      window.removeEventListener("beforeunload", this.onUnload);
    } else if (typeof process !== "undefined") {
      process.off("exit", () => this.onUnload);
    }

    /* Unbind from document/awareness callbacks */
    this.doc.off("update", this.onDocumentUpdateBound);
    this.awareness.off("update", this.onAwarenessUpdateBound);
    this.disconnect();
  }

  /* Private methods */
  private logger: Debugger;
  private channel: RealtimeChannel | null = null;
  private online: boolean = false;
  private resync: NodeJS.Timeout | undefined;
  private previous: Uint8Array | null = null;
  private saveDocumentDebounced: () => void;

  private onDocumentUpdateBound: typeof this.onDocumentUpdate;
  private onAwarenessUpdateBound: typeof this.onAwarenessUpdate;

  private connect() {
    this.channel = this.supabase.channel(this.config.channel);
    this.channel
      .on("broadcast", { event: ChannelEvents.Message }, ({ payload }) => {
        if (!this.online) return;
        try {
          console.log("received update");
          Y.applyUpdate(this.doc, Uint8Array.from(payload), origin);
        } catch (err: any) {
          this.logger(err);
        }
      })
      .on("broadcast", { event: ChannelEvents.Awareness }, ({ payload }) => {
        AwarenessProtocol.applyAwarenessUpdate(
          this.awareness,
          Uint8Array.from(payload),
          this
        );
      })
      .subscribe((status, err) => {
        switch (status) {
          case "SUBSCRIBED":
            this.emit(SupabaseProviderEvents.Connect);
            break;
          case "CHANNEL_ERROR":
            this.emit(SupabaseProviderEvents.Error);
            break;
          case "CLOSED":
          case "TIMED_OUT":
            this.emit(SupabaseProviderEvents.Disconnect);
            break;
        }
      });
  }

  private disconnect() {
    if (!this.channel) return;
    this.supabase.removeChannel(this.channel);
    this.channel = null;
  }

  private async onConnect() {
    this.logger("Successfully connected.");
    this.logger("Loading document data from Supabase.");
    const { data, error } = await this.supabase
      .from(this.config.diffView)
      .select(DiffColumns.Diffs)
      .eq(DiffColumns.Channel, this.config.channel)
      .maybeSingle();

    if (error) {
      // TODO: Communicate error
      this.logger("Failed to retrieve document data from Supabase", error);
    } else if (data) {
      this.logger("Retrieved data from Supabase.");
      const diffs: number[][] = data[DiffColumns.Diffs];
      try {
        this.logger("Applying data to document.");
        Y.applyUpdateV2(
          this.doc,
          Y.mergeUpdatesV2(diffs.map((d) => Uint8Array.from(d)))
        );
        this.previous = Y.encodeStateVector(this.doc);
      } catch (error) {
        // TODO: Communicate error
        this.logger("Applying document updates resulted in error", error);
      }
    } else {
      this.logger("No data was retrieved from Supabase.");
    }

    this.logger("Succesfully connected.");
    this.online = true;
  }

  private onDisconnect() {
    this.logger('Disconnecting provider.');
    this.online = false;

    // Update awareness (keep all users except local)
    // TODO: compare to broadcast channel behavior
    const states = Array.from(this.awareness.getStates().keys()).filter((client) => client !== this.doc.clientID);
    AwarenessProtocol.removeAwarenessStates(this.awareness, states, this);
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

    /* TODO: What does this do? */
    if (JSON.stringify([0, 0]) === JSON.stringify(content)) return;
    
    const record = {
      [DiffColumns.Channel]: this.config.channel,
      [DiffColumns.Diff]: content
    };

    const { error } = await this.supabase
      .from(this.config.diffTable)
      .insert(record);

    if (error) {
      // TODO: Communicate error
      throw error;
    }

    this.previous = Y.encodeStateVector(this.doc);
  }

  private onMessage(message: Uint8Array) {
    Y.logUpdate(message);
    console.log("sent message");
    if (this.channel)
      this.channel.send({
        type: "broadcast",
        event: ChannelEvents.Message,
        payload: Array.from(message),
      });
  }

  private onAwareness(message: Uint8Array) {
    if (this.channel)
      this.channel.send({
        type: "broadcast",
        event: ChannelEvents.Awareness,
        payload: Array.from(message),
      });
  }

  private onDocumentUpdate(update: Uint8Array, origin: any) {
    if (origin !== this) {
      this.emit(SupabaseProviderEvents.Message, update);
      this.saveDocumentDebounced();
    }
  }

  private onAwarenessUpdate({ added, updated, removed }: any, origin: any) {
    const changedClients = added.concat(updated).concat(removed);
    const awarenessUpdate = AwarenessProtocol.encodeAwarenessUpdate(
      this.awareness,
      changedClients
    );
    this.emit(SupabaseProviderEvents.Awareness, awarenessUpdate);
  }

  private onUnload() {
    AwarenessProtocol.removeAwarenessStates(
      this.awareness,
      [this.doc.clientID],
      this
    );
  }
}
