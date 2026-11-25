import { describe, expect, it } from "vitest";
import { getTitlesMessage, isGetTitlesRequest, bangumiResolveMessage, isBangumiResolveRequest } from "../../src/title-protocol";

describe("isBangumiResolveRequest", () => {
  it("accepts current-page Japanese title lookups", () => {
    expect(isBangumiResolveRequest({
      type: bangumiResolveMessage,
      items: [{ id: 176314, title: "佐々木とピーちゃん シーズン２", type: "ANIME" }],
    })).toBe(true);
  });

  it("rejects invalid titles and media types", () => {
    expect(isBangumiResolveRequest({ type: bangumiResolveMessage, items: [{ id: 1, title: "", type: "ANIME" }] })).toBe(false);
    expect(isBangumiResolveRequest({ type: bangumiResolveMessage, items: [{ id: 1, title: "Test", type: "OTHER" }] })).toBe(false);
  });
});

describe("isGetTitlesRequest", () => {
  it("accepts bounded positive integer IDs", () => {
    expect(isGetTitlesRequest({ type: getTitlesMessage, ids: [1, 16498] })).toBe(true);
  });

  it.each([
    null,
    { type: getTitlesMessage },
    { type: getTitlesMessage, ids: [] },
    { type: getTitlesMessage, ids: [0] },
    { type: getTitlesMessage, ids: [1.5] },
    { type: getTitlesMessage, ids: Array.from({ length: 101 }, () => 1) },
    { type: "other", ids: [1] },
  ])("rejects invalid input", (value) => {
    expect(isGetTitlesRequest(value)).toBe(false);
  });
});
