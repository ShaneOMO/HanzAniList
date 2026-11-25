import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";

const root = process.cwd();
const titles = JSON.parse(await readFile(path.join(root, "data", "titles.json"), "utf8"));
const records = new Map();

for (const entry of titles) {
  if (!Number.isSafeInteger(entry.id) || entry.id <= 0 || typeof entry.title !== "string" || !entry.title.trim()) {
    throw new Error(`无效译名记录：${JSON.stringify(entry)}`);
  }
  if (!["official", "community", "ai"].includes(entry.source?.type)) {
    throw new Error(`作品 ${entry.id} 缺少有效来源类型`);
  }
  records.set(entry.id, {
    t: entry.title.trim(),
    a: [...new Set((entry.aliases ?? []).filter((name) => typeof name === "string" && name.trim()).map((name) => name.trim()))],
    s: entry.source.type,
    n: entry.source.name,
    u: entry.source.url,
  });
}

const shards = Array.from({ length: 256 }, () => []);
for (const [id, record] of [...records.entries()].sort((a, b) => a[0] - b[0])) {
  shards[id & 255].push([id, record]);
}

const outputDir = path.join(root, "public", "titles", "shards");
await mkdir(outputDir, { recursive: true });
await Promise.all(shards.map((entries, index) => writeFile(
  path.join(outputDir, `${index.toString(16).padStart(2, "0")}.json`),
  JSON.stringify(Object.fromEntries(entries)),
)));
const release = createHash("sha256")
  .update(JSON.stringify([...records.entries()].sort((a, b) => a[0] - b[0])))
  .digest("hex")
  .slice(0, 16);
await writeFile(
  path.join(root, "public", "titles", "manifest.json"),
  `${JSON.stringify({ version: release, generatedAt: new Date().toISOString(), count: records.size }, null, 2)}\n`,
);
await mkdir(path.join(root, "src", "generated"), { recursive: true });
await writeFile(
  path.join(root, "src", "generated", "title-release.ts"),
  `export const titleRelease = ${JSON.stringify(release)};\n`,
);
console.log(`已从项目正式库生成 ${records.size} 条译名，分为 256 个分片。`);
