import { browser } from "wxt/browser";
import { searchBangumi } from "../scripts/lib/bangumi.mjs";
import { isBangumiResolveRequest, type BangumiLookup } from "./title-protocol";
import type { TitleRepository } from "./title-repository";
import type { TitleRecord } from "./types";

const retryDelay = 7 * 86400000;

export class BangumiService {
  private queue: Promise<void> = Promise.resolve();
  private lastRequest = 0;

  constructor(private readonly repository: TitleRepository) {}

  resolve(items: BangumiLookup[]): Promise<Map<number, TitleRecord>> {
    const result = new Map<number, TitleRecord>();
    const run = this.queue.then(async () => {
      for (const item of items) {
        try {
          const checkedAt = await this.repository.getMetadata<number>(`bangumi:${item.id}`);
          if (checkedAt && Date.now() - checkedAt < retryDelay) continue;
          const elapsed = Date.now() - this.lastRequest;
          if (elapsed < 350) await new Promise((resolve) => setTimeout(resolve, 350 - elapsed));
          this.lastRequest = Date.now();
          const match = await searchBangumi({
            type: item.type,
            title: { native: item.title },
          });
          await this.repository.setMetadata(`bangumi:${item.id}`, Date.now());
          if (!match) continue;
          const record: TitleRecord = {
            t: match.name_cn.trim(),
            a: [],
            s: "community",
            n: "Bangumi",
            u: `https://bgm.tv/subject/${match.id}`,
          };
          await this.repository.save(item.id, record);
          result.set(item.id, record);
        } catch {
          continue;
        }
      }
    });
    this.queue = run.catch(() => undefined);
    return run.then(() => result);
  }
}

export function registerBangumiService(repository: TitleRepository): void {
  const service = new BangumiService(repository);
  browser.runtime.onMessage.addListener((message: unknown) => {
    if (!isBangumiResolveRequest(message)) return undefined;
    return service.resolve(message.items).then((titles) => ({
      titles: Object.fromEntries([...titles].map(([id, record]) => [id, record])),
    }));
  });
}
