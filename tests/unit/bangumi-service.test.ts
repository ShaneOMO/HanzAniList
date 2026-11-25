import { beforeEach, describe, expect, it, vi } from "vitest";

const { searchBangumi } = vi.hoisted(() => ({ searchBangumi: vi.fn() }));
vi.mock("../../scripts/lib/bangumi.mjs", () => ({ searchBangumi }));

import { BangumiService } from "../../src/bangumi-service";

const item = { id: 176314, title: "佐々木とピーちゃん シーズン２", type: "ANIME" as const };

function repository(recentlyChecked = false) {
  return {
    getMetadata: vi.fn().mockResolvedValue(recentlyChecked ? Date.now() : undefined),
    setMetadata: vi.fn().mockResolvedValue(undefined),
    save: vi.fn().mockResolvedValue(undefined),
  };
}

describe("BangumiService", () => {
  beforeEach(() => searchBangumi.mockReset());

  it("resolves a Japanese title and persists the approved source", async () => {
    searchBangumi.mockResolvedValue({ id: 486456, name_cn: "佐佐木与文鸟小哔 第二季" });
    const store = repository();
    const result = await new BangumiService(store as never).resolve([item]);
    expect(result.get(item.id)?.t).toBe("佐佐木与文鸟小哔 第二季");
    expect(searchBangumi).toHaveBeenCalledWith({ type: "ANIME", title: { native: item.title } });
    expect(store.save).toHaveBeenCalledWith(item.id, expect.objectContaining({ n: "Bangumi" }));
    expect(store.setMetadata).toHaveBeenCalled();
  });

  it("uses the seven-day negative-result cooldown", async () => {
    const store = repository(true);
    const result = await new BangumiService(store as never).resolve([item]);
    expect(result.size).toBe(0);
    expect(searchBangumi).not.toHaveBeenCalled();
  });
});
