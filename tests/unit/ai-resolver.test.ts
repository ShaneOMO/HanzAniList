import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { findAiTitle } from "../../scripts/lib/ai.mjs";

const media = { type: "ANIME", title: { native: "テスト" }, startDate: { year: 2026 } };
const response = (candidate: unknown) => new Response(JSON.stringify({
  output: [{ content: [{ type: "output_text", text: JSON.stringify(candidate) }] }],
}), { status: 200 });

describe("AI title resolver", () => {
  beforeEach(() => vi.stubEnv("OPENAI_API_KEY", "test-key"));
  afterEach(() => vi.unstubAllEnvs());

  it("uses a verified web-search candidate without generating a translation", async () => {
    const fetchMock = vi.fn().mockResolvedValue(response({ title: "测试作品", aliases: [], evidenceUrl: "https://example.com/source" }));
    expect((await findAiTitle(media, fetchMock)).mode).toBe("web");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[1].body).toContain("web_search");
  });

  it("falls back to a clearly marked translation when search has no result", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response({ title: "", aliases: [], evidenceUrl: "" }))
      .mockResolvedValueOnce(response({ title: "测试暂译", aliases: [], evidenceUrl: "" }));
    const result = await findAiTitle(media, fetchMock);
    expect(result.mode).toBe("translate");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1]?.[1].body).not.toContain("web_search");
  });

  it("does not accept a web result without evidence", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response({ title: "无证据名称", aliases: [], evidenceUrl: "" }))
      .mockResolvedValueOnce(response({ title: "暂译", aliases: [], evidenceUrl: "" }));
    expect((await findAiTitle(media, fetchMock)).mode).toBe("translate");
  });

  it("supports a configured OpenAI-compatible completion URI without an API key", async () => {
    vi.stubEnv("OPENAI_API_KEY", "");
    vi.stubEnv("AI_COMPLETION_URI", "http://127.0.0.1:11434/v1/chat/completions");
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      choices: [{ message: { content: "```json\n{\"title\":\"本地暂译\",\"aliases\":[],\"evidenceUrl\":\"\"}\n```" } }],
    }), { status: 200 }));
    const result = await findAiTitle(media, fetchMock);
    expect(result.mode).toBe("translate");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toBe("http://127.0.0.1:11434/v1/chat/completions");
    expect(fetchMock.mock.calls[0]?.[1].headers.Authorization).toBeUndefined();
    expect(fetchMock.mock.calls[0]?.[1].body).toContain("messages");
  });

  it("uses web search on a completion assistant only when explicitly enabled", async () => {
    vi.stubEnv("OPENAI_API_KEY", "");
    vi.stubEnv("AI_COMPLETION_URI", "http://localhost:11434/v1/chat/completions");
    vi.stubEnv("AI_COMPLETION_WEB_SEARCH", "true");
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      choices: [{ message: { content: "{\"title\":\"联网名称\",\"aliases\":[],\"evidenceUrl\":\"https://example.com\"}" } }],
    }), { status: 200 }));
    expect((await findAiTitle(media, fetchMock)).mode).toBe("web");
    expect(fetchMock.mock.calls[0]?.[1].body).toContain("web_search");
  });

  it("does not make requests without an API key", async () => {
    vi.stubEnv("OPENAI_API_KEY", "");
    const fetchMock = vi.fn();
    expect(await findAiTitle(media, fetchMock)).toBeUndefined();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
