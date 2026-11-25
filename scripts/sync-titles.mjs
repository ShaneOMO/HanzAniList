import { searchBangumi } from "./lib/bangumi.mjs";
import { findAiTitle } from "./lib/ai.mjs";
import {
  mediaHash,
  queuePath,
  readJson,
  readTitles,
  statePath,
  upsertTitle,
  writeJson,
} from "./lib/store.mjs";

const args = process.argv.slice(2);
const aiConfigured = Boolean(process.env.OPENAI_API_KEY || process.env.AI_COMPLETION_URI);
const limitArg = args.find((arg) => arg.startsWith("--limit="));
const idsArg = args.find((arg) => arg.startsWith("--ids="));
const limit = Number(limitArg?.split("=")[1] ?? 20);
const requestedIds = idsArg?.split("=")[1].split(",").map(Number).filter(Number.isInteger);
const fields = `id type title { romaji english native } startDate { year month day }`;

async function fetchMedia() {
  const query = requestedIds
    ? `query { ${requestedIds.map((id, index) => `m${index}: Media(id: ${id}) { ${fields} }`).join("\n")} }`
    : `query { Page(page: 1, perPage: ${Math.min(limit, 20)}) { media(sort: POPULARITY_DESC) { ${fields} } } }`;
  const response = await fetch("https://graphql.anilist.co", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  if (response.status === 429) {
    const retry = Number(response.headers.get("Retry-After")) || 60;
    throw new Error(`AniList 限流，请 ${retry} 秒后重试。`);
  }
  if (!response.ok) throw new Error(`AniList HTTP ${response.status}`);
  const result = await response.json();
  if (result.errors?.length) throw new Error(JSON.stringify(result.errors));
  return requestedIds ? Object.values(result.data).filter(Boolean) : result.data.Page.media;
}

const approved = new Set((await readTitles()).map((entry) => entry.id));
const state = await readJson(statePath, {});
const queue = await readJson(queuePath, []);
const mediaItems = await fetchMedia();

for (const media of mediaItems.slice(0, limit)) {
  if (approved.has(media.id)) {
    console.log(`跳过已收录 ${media.id}`);
    continue;
  }
  const previous = state[media.id];
  const hash = mediaHash(media);
  if (previous?.status === "pending" && previous.hash === hash) {
    console.log(`跳过待确认 ${media.id}`);
    continue;
  }
  const now = Date.now();
  if (previous?.nextAttemptAt && Date.parse(previous.nextAttemptAt) > now) {
    console.log(`冷却中 ${media.id}，至 ${previous.nextAttemptAt}`);
    continue;
  }

  try {
    const bangumi = await searchBangumi(media);
    if (bangumi) {
      await upsertTitle({
        id: media.id,
        title: bangumi.name_cn.trim(),
        aliases: [],
        source: {
          type: "community",
          provider: "bangumi",
          name: "Bangumi",
          url: `https://bgm.tv/subject/${bangumi.id}`,
        },
        updatedAt: new Date().toISOString(),
      });
      state[media.id] = { hash: mediaHash(media), status: "approved", checkedAt: new Date().toISOString() };
      console.log(`Bangumi 已收录 ${media.id}：${bangumi.name_cn}`);
    } else {
      const candidate = await findAiTitle(media);
      if (candidate) {
        const entry = {
          id: media.id,
          media,
          candidate,
          createdAt: new Date().toISOString(),
        };
        const index = queue.findIndex((item) => item.id === media.id);
        if (index >= 0) queue[index] = entry;
        else queue.push(entry);
        await writeJson(queuePath, queue);
        state[media.id] = {
          hash: mediaHash(media),
          status: "pending",
          checkedAt: new Date().toISOString(),
        };
        console.log(`待确认 ${media.id}：${candidate.title} (${candidate.mode})`);
      } else {
        state[media.id] = {
          hash: mediaHash(media),
          status: aiConfigured ? "not-found" : "ai-not-configured",
          checkedAt: new Date().toISOString(),
          nextAttemptAt: aiConfigured ? new Date(now + 30 * 86400000).toISOString() : undefined,
        };
        console.log(`暂无译名 ${media.id}`);
      }
    }
    await writeJson(statePath, state);
  } catch (error) {
    console.error(`处理失败 ${media.id}:`, error.message);
  }
  await new Promise((resolve) => setTimeout(resolve, 300));
}

console.log(`完成。运行 pnpm titles:review 打开确认页面。`);
