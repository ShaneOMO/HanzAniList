import { sourceLabel } from "./source-label";
import type { Settings, TitleRecord } from "./types";

export const tooltipAttribute = "data-hanz-title";

export function applyTitle(element: HTMLElement, record: TitleRecord, settings: Settings): void {
  const original = element.dataset.hanzOriginal ?? element.textContent?.trim() ?? "";
  if (!original || (record.s === "ai" && !settings.aiTranslations)) return;
  element.dataset.hanzOriginal = original;
  element.dataset.hanzAliases = record.a.join("；");
  element.dataset.hanzSource = sourceLabel(record);
  element.dataset.hanzSourceUrl = record.u ?? "https://github.com/soruly/anilist-chinese";
  element.setAttribute(tooltipAttribute, record.t);
  element.textContent = settings.showOriginal ? `${record.t} · ${original}` : record.t;
}

export function mediaIdFromUrl(value: string, base = "https://anilist.co"): number | undefined {
  try {
    const path = new URL(value, base).pathname;
    const match = /^\/(?:anime|manga)\/(\d+)(?:\/|$)/.exec(path);
    return match ? Number(match[1]) : undefined;
  } catch {
    return undefined;
  }
}

export function findTitleTargets(root: ParentNode, pathname: string): Array<{ id: number; element: HTMLElement }> {
  const anchors: HTMLAnchorElement[] = [];
  if (root instanceof HTMLAnchorElement) anchors.push(root);
  anchors.push(...root.querySelectorAll<HTMLAnchorElement>("a[href*='/anime/'], a[href*='/manga/']"));
  const results: Array<{ id: number; element: HTMLElement }> = [];

  for (const anchor of anchors) {
    const id = mediaIdFromUrl(anchor.getAttribute("href") ?? anchor.href);
    if (!id || anchor.dataset.hanzMediaId === String(id)) continue;
    const labelled = anchor.querySelector<HTMLElement>(".title, [class~='title']");
    const element = labelled ?? (anchor.children.length === 0 ? anchor : undefined);
    if (!element?.textContent?.trim()) continue;
    anchor.dataset.hanzMediaId = String(id);
    results.push({ id, element });
  }

  const detailId = mediaIdFromUrl(pathname);
  if (detailId) {
    const headings = [
      ...(root instanceof HTMLHeadingElement ? [root] : []),
      ...root.querySelectorAll<HTMLHeadingElement>("h1"),
    ];
    for (const element of headings) {
      if (element.dataset.hanzMediaId !== String(detailId) && element.textContent?.trim()) {
        element.dataset.hanzMediaId = String(detailId);
        results.push({ id: detailId, element });
      }
    }
  }
  return results;
}
