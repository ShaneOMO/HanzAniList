import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("wxt/browser", () => ({
  browser: { runtime: { getURL: (path: string) => `chrome-extension://test${path}` } },
}));

import { TitleRepository } from "../../src/title-repository";

describe("TitleRepository", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("loads one local shard for repeated IDs and never calls AniList", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ "1": { t: "星际牛仔", a: [], s: "community" } }), { status: 200 }),
    );
    const repository = new TitleRepository();
    expect((await repository.get(1))?.t).toBe("星际牛仔");
    expect((await repository.get(1))?.t).toBe("星际牛仔");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toBe("chrome-extension://test/titles/shards/01.json");
  });

  it("keeps an unknown title unresolved", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("{}", { status: 200 }));
    const repository = new TitleRepository();
    expect(await repository.get(999999)).toBeUndefined();
  });
});
