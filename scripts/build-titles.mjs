import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const sourcePath = path.join(root, "data", ".upstream-titles.json");
const outputDir = path.join(root, "public", "titles", "shards");

if (process.argv.includes("--download")) {
  const response = await fetch(
    "https://raw.githubusercontent.com/soruly/anilist-chinese/master/anilist-chinese.json",
  );
  if (!response.ok) throw new Error(`下载译名库失败：${response.status}`);
  await mkdir(path.dirname(sourcePath), { recursive: true });
  await writeFile(sourcePath, await response.text());
}

const source = JSON.parse(await readFile(sourcePath, "utf8"));
const curated = JSON.parse(
  await readFile(path.join(root, "data", "curated-titles.json"), "utf8"),
);
const overrides = new Map(curated.map((entry) => [entry.id, entry]));
const records = new Map();

for (const entry of source) {
  if (!Number.isInteger(entry.id) || typeof entry.title !== "string" || !entry.title.trim()) {
    continue;
  }
  records.set(entry.id, {
    t: entry.title.trim(),
    a: Array.isArray(entry.synonyms)
      ? [...new Set(entry.synonyms.filter((name) => typeof name === "string" && name.trim()).map((name) => name.trim()))]
      : [],
    s: "community",
  });
}

for (const [id, entry] of overrides) {
  const existing = records.get(id);
  records.set(id, {
    t: entry.title,
    a: [...new Set([...(existing ? [existing.t, ...existing.a] : []), ...(entry.aliases ?? [])])],
    s: entry.sourceType,
    n: entry.sourceName,
    u: entry.sourceUrl,
  });
}

const shards = Array.from({ length: 256 }, () => []);
for (const [id, record] of [...records.entries()].sort((a, b) => a[0] - b[0])) {
  shards[id & 255].push([id, record]);
}

await mkdir(outputDir, { recursive: true });
await Promise.all(
  shards.map((entries, index) =>
    writeFile(
      path.join(outputDir, `${index.toString(16).padStart(2, "0")}.json`),
      JSON.stringify(Object.fromEntries(entries)),
    ),
  ),
);
await writeFile(
  path.join(root, "public", "titles", "manifest.json"),
  `${JSON.stringify({ version: 1, generatedAt: new Date().toISOString(), count: records.size }, null, 2)}\n`,
);
console.log(`已生成 ${records.size} 条译名，分为 256 个分片。`);
