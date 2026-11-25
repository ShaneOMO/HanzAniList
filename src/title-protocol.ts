import type { TitleRecord } from "./types";

export const getTitlesMessage = "hanz:get-titles";
export const bangumiResolveMessage = "hanz:bangumi-resolve";

export interface BangumiLookup {
  id: number;
  title: string;
  type: "ANIME" | "MANGA";
}

export interface BangumiResolveRequest {
  type: typeof bangumiResolveMessage;
  items: BangumiLookup[];
}

export interface GetTitlesRequest {
  type: typeof getTitlesMessage;
  ids: number[];
}

export interface GetTitlesResponse {
  titles: Record<string, TitleRecord>;
}

export function isBangumiResolveRequest(message: unknown): message is BangumiResolveRequest {
  if (!message || typeof message !== "object") return false;
  const request = message as Partial<BangumiResolveRequest>;
  return request.type === bangumiResolveMessage
    && Array.isArray(request.items)
    && request.items.length > 0
    && request.items.length <= 50
    && request.items.every((item) => Number.isSafeInteger(item.id)
      && item.id > 0
      && ["ANIME", "MANGA"].includes(item.type)
      && typeof item.title === "string"
      && item.title.trim().length > 0
      && item.title.length <= 300);
}

export function isGetTitlesRequest(message: unknown): message is GetTitlesRequest {
  if (!message || typeof message !== "object") return false;
  const request = message as Partial<GetTitlesRequest>;
  return request.type === getTitlesMessage
    && Array.isArray(request.ids)
    && request.ids.length > 0
    && request.ids.length <= 100
    && request.ids.every((id) => Number.isSafeInteger(id) && id > 0);
}
