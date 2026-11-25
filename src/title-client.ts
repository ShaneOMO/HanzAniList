import { browser } from "wxt/browser";
import { bangumiResolveMessage, getTitlesMessage, type BangumiLookup, type GetTitlesResponse } from "./title-protocol";
import type { TitleProvider } from "./title-provider";
import type { TitleRecord } from "./types";

interface PendingTitle {
  promise: Promise<TitleRecord | undefined>;
  resolve: (record: TitleRecord | undefined) => void;
  reject: (error: unknown) => void;
}

export class TitleClient implements TitleProvider {
  private readonly cache = new Map<number, TitleRecord | undefined>();
  private readonly pending = new Map<number, PendingTitle>();
  private readonly queue = new Set<number>();
  private scheduled = false;

  async getMany(ids: number[]): Promise<Map<number, TitleRecord>> {
    const entries = await Promise.all([...new Set(ids)].map(async (id) => [id, await this.get(id)] as const));
    return new Map(entries.filter((entry): entry is readonly [number, TitleRecord] => entry[1] !== undefined));
  }

  async resolveBangumi(items: BangumiLookup[]): Promise<Map<number, TitleRecord>> {
    const response = await browser.runtime.sendMessage({ type: bangumiResolveMessage, items }) as GetTitlesResponse;
    const records = new Map<number, TitleRecord>();
    for (const [id, record] of Object.entries(response.titles)) {
      records.set(Number(id), record);
      this.cache.set(Number(id), record);
    }
    return records;
  }

  private get(id: number): Promise<TitleRecord | undefined> {
    if (this.cache.has(id)) return Promise.resolve(this.cache.get(id));
    const existing = this.pending.get(id);
    if (existing) return existing.promise;

    let resolve!: (record: TitleRecord | undefined) => void;
    let reject!: (error: unknown) => void;
    const promise = new Promise<TitleRecord | undefined>((resolvePromise, rejectPromise) => {
      resolve = resolvePromise;
      reject = rejectPromise;
    });
    this.pending.set(id, { promise, resolve, reject });
    this.queue.add(id);
    if (!this.scheduled) {
      this.scheduled = true;
      queueMicrotask(() => {
        this.scheduled = false;
        void this.flush();
      });
    }
    return promise;
  }

  private async flush(): Promise<void> {
    const ids = [...this.queue];
    this.queue.clear();
    if (!ids.length) return;
    const chunks = Array.from({ length: Math.ceil(ids.length / 100) }, (_, index) => ids.slice(index * 100, (index + 1) * 100));
    await Promise.all(chunks.map(async (chunk) => {
      try {
        const response = await browser.runtime.sendMessage({ type: getTitlesMessage, ids: chunk }) as GetTitlesResponse;
        for (const id of chunk) {
          const record = response.titles[id];
          this.cache.set(id, record);
          this.pending.get(id)?.resolve(record);
          this.pending.delete(id);
        }
      } catch (error) {
        for (const id of chunk) {
          this.pending.get(id)?.reject(error);
          this.pending.delete(id);
        }
      }
    }));
  }
}
