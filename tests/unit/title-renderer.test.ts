import { describe, expect, it } from "vitest";
import { applyTitle, findTitleTargets, mediaIdFromUrl } from "../../src/title-renderer";
import { defaultSettings } from "../../src/types";

const official = { t: "进击的巨人", a: ["巨人"], s: "official" as const, n: "出版社" };

describe("mediaIdFromUrl", () => {
  it("accepts anime and manga URLs", () => {
    expect(mediaIdFromUrl("/anime/16498/Shingeki-no-Kyojin/")).toBe(16498);
    expect(mediaIdFromUrl("https://anilist.co/manga/30013")).toBe(30013);
    expect(mediaIdFromUrl("/animelist")).toBeUndefined();
    expect(mediaIdFromUrl("https://example.com/anime/1")).toBe(1);
  });
});

describe("findTitleTargets", () => {
  it("finds card titles and the detail heading without replacing artwork", () => {
    document.body.innerHTML = '<a href="/anime/16498/x/"><img><span class="title">Attack on Titan</span></a><h1>Attack on Titan</h1>';
    const targets = findTitleTargets(document, "/anime/16498/x/");
    expect(targets).toHaveLength(2);
    expect(targets.every((target) => target.id === 16498)).toBe(true);
    expect(document.querySelector("img")).not.toBeNull();
  });

  it("deduplicates an already resolved link", () => {
    document.body.innerHTML = '<a href="/manga/30013">Berserk</a>';
    findTitleTargets(document, "/");
    expect(findTitleTargets(document, "/")).toHaveLength(0);
  });
});

describe("applyTitle", () => {
  it("retains original text, aliases and provenance", () => {
    const element = document.createElement("h1");
    element.textContent = "Attack on Titan";
    applyTitle(element, official, defaultSettings);
    expect(element.textContent).toBe("进击的巨人");
    expect(element.dataset.hanzOriginal).toBe("Attack on Titan");
    expect(element.dataset.hanzSource).toContain("官方译名");
    applyTitle(element, official, { ...defaultSettings, showOriginal: true });
    expect(element.textContent).toBe("进击的巨人 · Attack on Titan");
  });

  it("honors the AI translation opt-out", () => {
    const element = document.createElement("span");
    element.textContent = "Unknown title";
    applyTitle(element, { t: "未知标题", a: [], s: "ai" }, { ...defaultSettings, aiTranslations: false });
    expect(element.textContent).toBe("Unknown title");
  });
});
