import type { TitleRecord } from "./types";

export interface TitleProvider {
  getMany(ids: number[]): Promise<Map<number, TitleRecord>>;
  resolveBangumi(items: import("./title-protocol").BangumiLookup[]): Promise<Map<number, TitleRecord>>;
}
