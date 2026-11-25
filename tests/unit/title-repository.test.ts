import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { indexedDB as fakeIndexedDB } from "fake-indexeddb";

vi.mock("wxt/browser", () => ({
  browser: { runtime: { getURL: (path: string) => `chrome-extension://test${path}` } },
}));

import { TitleRepository } from "../../src/title-repository";

describe("TitleRepository", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.stubGlobal("indexedDB", fakeIndexedDB);
  });
  afterEach(() => vi.unstubAllGlobals());

  it("loads one local shard for repeated IDs and never calls AniList", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ "1": { t: "星际牛仔", a: [], s: "community" } }), { status: 200 }),
    );
    const repository = new TitleRepository();
    expect((await repository.getMany([1, 257])).get(1)?.t).toBe("星际牛仔");
    expect((await repository.get(1))?.t).toBe("星际牛仔");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toBe("chrome-extension://test/titles/shards/01.json");
  });

  it("discards titles cached by an older database release", async () => {
    const databaseName = `hanz-release-${Date.now()}`;
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open(databaseName, 1);
      request.onupgradeneeded = () => {
        const store = request.result.createObjectStore("titles", { keyPath: "id" });
        store.put({ id: 1, t: "星際牛仔", a: [], s: "community" });
      };
      request.onsuccess = () => { request.result.close(); resolve(); };
      request.onerror = () => reject(request.error);
    });
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({
      "1": { t: "星际牛仔", a: [], s: "community" },
    }), { status: 200 }));
    expect((await new TitleRepository(databaseName).get(1))?.t).toBe("星际牛仔");
  });

  it("keeps an unknown title unresolved", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("{}", { status: 200 }));
    const repository = new TitleRepository();
    expect(await repository.get(999999)).toBeUndefined();
  });
});
