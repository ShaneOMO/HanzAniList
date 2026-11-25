import http from "node:http";
import { readFile } from "node:fs/promises";
import { queuePath, readJson, statePath, upsertTitle, writeJson } from "./lib/store.mjs";

const port = Number(process.env.PORT ?? 4173);
const page = await readFile(new URL("./review.html", import.meta.url), "utf8");

function send(response, status, body, type = "application/json; charset=utf-8") {
  response.writeHead(status, { "Content-Type": type, "Cache-Control": "no-store" });
  response.end(type.startsWith("application/json") ? JSON.stringify(body) : body);
}

async function body(request) {
  let value = "";
  for await (const chunk of request) {
    value += chunk;
    if (value.length > 32768) throw new Error("请求过大");
  }
  return JSON.parse(value || "{}");
}

const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url, "http://localhost");
    if (request.method === "GET" && url.pathname === "/") {
      return send(response, 200, page, "text/html; charset=utf-8");
    }
    if (request.method === "GET" && url.pathname === "/api/queue") {
      return send(response, 200, await readJson(queuePath, []));
    }
    if (request.method === "POST" && ["/api/approve", "/api/reject"].includes(url.pathname)) {
      const input = await body(request);
      const queue = await readJson(queuePath, []);
      const entry = queue.find((item) => item.id === input.id);
      if (!entry) return send(response, 404, { error: "候选不存在或已处理" });
      const state = await readJson(statePath, {});

      if (url.pathname === "/api/approve") {
        const title = String(input.title ?? "").trim();
        if (!title || title.length > 200) return send(response, 400, { error: "译名不能为空或超过 200 字" });
        const aliases = Array.isArray(input.aliases)
          ? [...new Set(input.aliases.map((item) => String(item).trim()).filter(Boolean))]
          : [];
        const web = entry.candidate.mode === "web";
        const sourceType = ["official", "community", "ai"].includes(input.sourceType)
          ? input.sourceType
          : (web ? "community" : "ai");
        await upsertTitle({
          id: entry.id,
          title,
          aliases,
          source: {
            type: sourceType,
            provider: web ? "ai-web" : "ai-translate",
            name: web ? "AI 联网检索（人工确认）" : "AI 暂译（人工确认）",
            url: web ? entry.candidate.evidenceUrl : "",
          },
          updatedAt: new Date().toISOString(),
        });
        state[entry.id] = { status: "approved", checkedAt: new Date().toISOString() };
      } else {
        state[entry.id] = {
          status: "rejected",
          checkedAt: new Date().toISOString(),
          nextAttemptAt: new Date(Date.now() + 90 * 86400000).toISOString(),
        };
      }
      await writeJson(queuePath, queue.filter((item) => item.id !== entry.id));
      await writeJson(statePath, state);
      return send(response, 200, { ok: true });
    }
    send(response, 404, { error: "Not found" });
  } catch (error) {
    send(response, 500, { error: error.message });
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`译名维护页面：http://127.0.0.1:${port}`);
});
