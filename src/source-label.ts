import type { TitleRecord } from "./types";

export function sourceLabel(record: TitleRecord): string {
  if (record.s === "official") return `官方译名 · ${record.n ?? "官方来源"}`;
  if (record.s === "ai") return "AI 暂译 · 尚无已验证中文名";
  return `民间常用译名 · ${record.n ?? "soruly/anilist-chinese"}`;
}
