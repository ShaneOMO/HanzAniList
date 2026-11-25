import { browser } from "wxt/browser";
import { titleRelease } from "./generated/title-release";
import type { TitleRecord } from "./types";

interface StoredTitle extends TitleRecord {
  id: number;
}

export class TitleRepository {
  private readonly memory = new Map<number, TitleRecord | null>();
  private readonly shards = new Map<number, Promise<void>>();
  private database?: Promise<IDBDatabase>;
  private releaseReady?: Promise<void>;

  constructor(private readonly databaseName = "hanz-anilist") {}

  async get(id: number): Promise<TitleRecord | undefined> {
    return (await this.getMany([id])).get(id);
  }

  async save(id: number, record: TitleRecord): Promise<void> {
    this.memory.set(id, record);
    await this.writeMany([{ id, ...record }]);
  }

  async getMetadata<T>(key: string): Promise<T | undefined> {
    try {
      const database = await this.open();
      if (!database) return undefined;
      await this.prepare(database);
      return await new Promise((resolve, reject) => {
        const request = database.transaction("metadata", "readonly").objectStore("metadata").get(key);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    } catch {
      return undefined;
    }
  }

  async setMetadata(key: string, value: unknown): Promise<void> {
    try {
      const database = await this.open();
      if (!database) return;
      await this.prepare(database);
      await new Promise<void>((resolve, reject) => {
        const transaction = database.transaction("metadata", "readwrite");
        transaction.objectStore("metadata").put(value, key);
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      });
    } catch {
      return;
    }
  }

  async getMany(ids: number[]): Promise<Map<number, TitleRecord>> {
    const uniqueIds = [...new Set(ids)];
    const missing = new Set<number>();

    for (const id of uniqueIds) {
      if (!this.memory.has(id)) missing.add(id);
    }
    const stored = await this.readMany([...missing]);
    for (const [id, record] of stored) {
      const { id: _id, ...title } = record;
      this.memory.set(id, title);
      missing.delete(id);
    }

    const shardIds = [...new Set([...missing].map((id) => id & 255))];
    await this.runLimited(shardIds, 4, async (shard) => {
      let loading = this.shards.get(shard);
      if (!loading) {
        loading = this.loadShard(shard);
        this.shards.set(shard, loading);
      }
      await loading;
    });

    const result = new Map<number, TitleRecord>();
    for (const id of uniqueIds) {
      const record = this.memory.get(id);
      if (record) result.set(id, record);
      else this.memory.set(id, null);
    }
    return result;
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
    } catch (error) {
      this.shards.delete(shard);
      throw error;
    }
  }

  private open(): Promise<IDBDatabase> | undefined {
    if (typeof indexedDB === "undefined") return undefined;
    this.database ??= new Promise((resolve, reject) => {
      const request = indexedDB.open(this.databaseName, 2);
      request.onupgradeneeded = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains("titles")) database.createObjectStore("titles", { keyPath: "id" });
        if (!database.objectStoreNames.contains("metadata")) database.createObjectStore("metadata");
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    return this.database;
  }

  private async prepare(database: IDBDatabase): Promise<void> {
    this.releaseReady ??= (async () => {
      const current = await new Promise<string | undefined>((resolve, reject) => {
        const request = database.transaction("metadata", "readonly").objectStore("metadata").get("titleRelease");
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      if (current === titleRelease) return;
      await new Promise<void>((resolve, reject) => {
        const transaction = database.transaction(["titles", "metadata"], "readwrite");
        transaction.objectStore("titles").clear();
        transaction.objectStore("metadata").put(titleRelease, "titleRelease");
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      });
    })();
    return this.releaseReady;
  }

  private async readMany(ids: number[]): Promise<Map<number, StoredTitle>> {
    const result = new Map<number, StoredTitle>();
    if (!ids.length) return result;
    try {
      const database = await this.open();
      if (!database) return result;
      await this.prepare(database);
      await new Promise<void>((resolve, reject) => {
        const transaction = database.transaction("titles", "readonly");
        const store = transaction.objectStore("titles");
        for (const id of ids) {
          const request = store.get(id);
          request.onsuccess = () => {
            if (request.result) result.set(id, request.result);
          };
        }
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      });
    } catch {
      return result;
    }
    return result;
  }

  private async writeMany(records: StoredTitle[]): Promise<void> {
    try {
      const database = await this.open();
      if (!database) return;
      await this.prepare(database);
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

  private async runLimited<T>(items: T[], limit: number, task: (item: T) => Promise<void>): Promise<void> {
    let index = 0;
    const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (index < items.length) await task(items[index++]!);
    });
    await Promise.all(workers);
  }
}
