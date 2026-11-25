import { describe, expect, it } from "vitest";
import { normalizeTitle, selectBangumiMatch } from "../../scripts/lib/bangumi.mjs";

const media = {
  id: 16498,
  type: "ANIME",
  title: { native: "進撃の巨人", romaji: "Shingeki no Kyojin", english: "Attack on Titan" },
  startDate: { year: 2013 },
};

describe("Bangumi title matching", () => {
  it("normalizes punctuation, spacing and full-width characters", () => {
    expect(normalizeTitle(" 進撃の巨人：２ ")).toBe("進撃の巨人2");
    expect(normalizeTitle("佐々木とピーちゃん シーズン２")).toBe(normalizeTitle("佐々木とピーちゃん 第2期"));
    expect(normalizeTitle("Example 2nd Season")).toBe(normalizeTitle("Example 第二期"));
  });

  it("accepts an exact original title with matching type and year", () => {
    const match = selectBangumiMatch(media, [
      { id: 425, name: "進撃の巨人", name_cn: "进击的巨人", type: 2, date: "2013-04-06" },
    ]);
    expect(match.name_cn).toBe("进击的巨人");
  });

  it("rejects wrong media types and entries without Chinese names", () => {
    expect(selectBangumiMatch(media, [
      { id: 1, name: "進撃の巨人", name_cn: "进击的巨人", type: 1, date: "2013-04-06" },
      { id: 2, name: "進撃の巨人", name_cn: "", type: 2, date: "2013-04-06" },
    ])).toBeUndefined();
  });

  it("rejects ambiguous same-name releases without a year match", () => {
    expect(selectBangumiMatch(media, [
      { id: 1, name: "進撃の巨人", name_cn: "进击的巨人", type: 2, date: "2000-01-01" },
      { id: 2, name: "進撃の巨人", name_cn: "进击的巨人", type: 2, date: "2020-01-01" },
    ])).toBeUndefined();
  });

  it("does not accept fuzzy title matches", () => {
    expect(selectBangumiMatch(media, [
      { id: 3, name: "進撃の巨人 第二季", name_cn: "进击的巨人 第二季", type: 2, date: "2013-04-06" },
    ])).toBeUndefined();
  });
});
