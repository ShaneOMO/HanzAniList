import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export const dataDir = path.resolve(process.env.HANZ_DATA_DIR ?? "data");
export const titlesPath = path.join(dataDir, "titles.json");
export const statePath = path.join(dataDir, "resolver-state.json");
export const queuePath = path.join(dataDir, "review-queue.json");

export async function readJson(file, fallback) {
  try {
    return JSON.parse(await readFile(file, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") return fallback;
    throw error;
  }
}

export async function writeJson(file, value) {
  await writeFile(file, `${JSON.stringify(value, null, 2)}\n`);
}

export async function readTitles() {
  return readJson(titlesPath, []);
}

export async function upsertTitle(entry) {
  const titles = await readTitles();
  const index = titles.findIndex((item) => item.id === entry.id);
  if (index >= 0) titles[index] = entry;
  else titles.push(entry);
  titles.sort((a, b) => a.id - b.id);
  await writeJson(titlesPath, titles);
}

export function mediaHash(media) {
  return JSON.stringify([media.id, media.type, media.title, media.startDate?.year]);
}
