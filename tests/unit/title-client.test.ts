import { beforeEach, describe, expect, it, vi } from "vitest";

const { sendMessage } = vi.hoisted(() => ({ sendMessage: vi.fn() }));
vi.mock("wxt/browser", () => ({ browser: { runtime: { sendMessage } } }));

import { TitleClient } from "../../src/title-client";
import { getTitlesMessage } from "../../src/title-protocol";

describe("TitleClient", () => {
  beforeEach(() => sendMessage.mockReset());

  it("coalesces requests and deduplicates pending IDs", async () => {
    sendMessage.mockResolvedValue({ titles: { "1": { t: "星际牛仔", a: [], s: "community" } } });
    const client = new TitleClient();
    const [first, second] = await Promise.all([client.getMany([1, 1]), client.getMany([1, 2])]);
    expect(first.get(1)?.t).toBe("星际牛仔");
    expect(second.get(1)?.t).toBe("星际牛仔");
    expect(second.has(2)).toBe(false);
    expect(sendMessage).toHaveBeenCalledTimes(1);
    expect(sendMessage).toHaveBeenCalledWith({ type: getTitlesMessage, ids: [1, 2] });
  });

  it("chunks large batches and caches misses", async () => {
    sendMessage.mockImplementation((...args: Array<{ ids: number[] } | undefined>) => {
      const request = args.find((value) => value !== undefined);
      if (!request) return Promise.resolve({ titles: {} });
      return Promise.resolve({
        titles: Object.fromEntries(request.ids.map((id) => [id, { t: `作品 ${id}`, a: [], s: "community" }])),
      });
    });
    const client = new TitleClient();
    const ids = Array.from({ length: 101 }, (_, index) => index + 1);
    expect((await client.getMany(ids)).size).toBe(101);
    expect(sendMessage).toHaveBeenCalledTimes(2);
    expect(sendMessage.mock.calls[0]?.[0].ids).toHaveLength(100);
    expect(sendMessage.mock.calls[1]?.[0].ids).toHaveLength(1);
    await client.getMany([1]);
    expect(sendMessage).toHaveBeenCalledTimes(2);
  });
});
