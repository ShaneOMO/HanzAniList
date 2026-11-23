import { browser } from "wxt/browser";
import type { TitleRecord } from "./types";

interface StoredTitle extends TitleRecord {
  id: number;
}

export class TitleRepository {
  private readonly memory = new Map<number, TitleRecord | null>();
  private readonly shards = new Map<number, Promise<void>>();
  private database?: Promise<IDBDatabase>;

  async get(id: number): Promise<TitleRecord | undefined> {
    const cached = this.memory.get(id);
    if (cached !== undefined) return cached ?? undefined;

    const stored = await this.read(id);
    if (stored) {
      const { id: _id, ...record } = stored;
      this.memory.set(id, record);
      return record;
    }

    const shard = id & 255;
    let loading = this.shards.get(shard);
    if (!loading) {
      loading = this.loadShard(shard);
      this.shards.set(shard, loading);
    }
    await loading;
    if (!this.memory.has(id)) this.memory.set(id, null);
    return this.memory.get(id) ?? undefined;
  }

  private async loadShard(shard: number): Promise<void> {
    try {
      const name = shard.toString(16).padStart(2, "0");
      const runtime = browser.runtime as unknown as { getURL: (path: string) => string };
      const response = await fetch(runtime.getURL(`/titles/shards/${name}.json`));
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const entries = Object.entries(await response.json()) as Array<[string, TitleRecord]>;
      const stored: StoredTitle[] = [];
      for (const [rawId, record] of entries) {
        const id = Number(rawId);
        this.memory.set(id, record);
        stored.push({ id, ...record });
      }
      await this.writeMany(stored);
    } catch {
      this.shards.delete(shard);
    }
  }

  private open(): Promise<IDBDatabase> | undefined {
    if (typeof indexedDB === "undefined") return undefined;
    this.database ??= new Promise((resolve, reject) => {
      const request = indexedDB.open("hanz-anilist", 1);
      request.onupgradeneeded = () => request.result.createObjectStore("titles", { keyPath: "id" });
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    return this.database;
  }

  private async read(id: number): Promise<StoredTitle | undefined> {
    try {
      const database = await this.open();
      if (!database) return undefined;
      return await new Promise((resolve, reject) => {
        const request = database.transaction("titles", "readonly").objectStore("titles").get(id);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    } catch {
      return undefined;
    }
  }

  private async writeMany(records: StoredTitle[]): Promise<void> {
    try {
      const database = await this.open();
      if (!database) return;
      await new Promise<void>((resolve, reject) => {
        const transaction = database.transaction("titles", "readwrite");
        const store = transaction.objectStore("titles");
        for (const record of records) store.put(record);
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      });
    } catch {
      return;
    }
  }
}
