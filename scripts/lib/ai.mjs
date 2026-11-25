function completionUri() {
  return process.env.AI_COMPLETION_URI?.trim();
}

function isConfigured() {
  return Boolean(completionUri() || process.env.OPENAI_API_KEY);
}

function outputText(response) {
  if (response.choices) {
    const content = response.choices[0]?.message?.content;
    return Array.isArray(content)
      ? content.filter((part) => part.type === "text").map((part) => part.text).join("")
      : content ?? "";
  }
  return response.output?.flatMap((item) => item.content ?? [])
    .filter((content) => content.type === "output_text")
    .map((content) => content.text)
    .join("") ?? "";
}

async function request(media, mode, fetchImpl) {
  const titles = Object.values(media.title ?? {}).filter(Boolean).join(" / ");
  const web = mode === "web";
  const prompt = web
    ? `为以下${media.type === "ANIME" ? "动画" : "漫画"}查找可验证的中文译名。优先官方中文名，其次字幕组或汉化组常用名。必须使用网络搜索核实，不能凭记忆编造。若没有可靠中文名，title 返回空字符串。作品：${titles}，年份：${media.startDate?.year ?? "未知"}。返回 JSON：title、aliases（字符串数组）、evidenceUrl（证据链接）。`
    : `为以下作品生成简洁、自然、符合中文作品命名习惯的暂译。不要声称它是官方名称，不要搜索网络。作品：${titles}。返回 JSON：title、aliases（字符串数组）、evidenceUrl（空字符串）。`;
  const uri = completionUri();
  const headers = { "Content-Type": "application/json" };
  if (process.env.OPENAI_API_KEY) headers.Authorization = `Bearer ${process.env.OPENAI_API_KEY}`;
  const response = await fetchImpl(uri ?? process.env.AI_BASE_URL ?? "https://api.openai.com/v1/responses", {
    method: "POST",
    headers,
    body: JSON.stringify(uri ? {
      model: process.env.AI_MODEL ?? "gpt-5-mini",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      ...(web ? { tools: [{ type: "web_search" }] } : {}),
    } : {
      model: process.env.AI_MODEL ?? "gpt-5-mini",
      input: prompt,
      ...(web ? { tools: [{ type: "web_search" }] } : {}),
      text: {
        format: {
          type: "json_schema",
          name: "chinese_title",
          strict: true,
          schema: {
            type: "object",
            properties: {
              title: { type: "string" },
              aliases: { type: "array", items: { type: "string" } },
              evidenceUrl: { type: "string" },
            },
            required: ["title", "aliases", "evidenceUrl"],
            additionalProperties: false,
          },
        },
      },
    }),
  });
  if (!response.ok) throw new Error(`AI HTTP ${response.status}: ${await response.text()}`);
  const result = outputText(await response.json()).replace(/^```(?:json)?\s*|\s*```$/g, "");
  if (!result) return undefined;
  const candidate = JSON.parse(result);
  return candidate.title?.trim() ? candidate : undefined;
}

export async function findAiTitle(media, fetchImpl = fetch) {
  if (!isConfigured()) return undefined;
  const uri = completionUri();
  const canSearch = !uri || process.env.AI_COMPLETION_WEB_SEARCH === "true";
  if (canSearch) {
    const searched = await request(media, "web", fetchImpl);
    if (searched?.evidenceUrl?.trim()) return { ...searched, mode: "web" };
  }
  const translated = await request(media, "translate", fetchImpl);
  return translated ? { ...translated, mode: "translate" } : undefined;
}
