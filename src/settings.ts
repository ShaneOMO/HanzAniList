import { browser } from "wxt/browser";
import { defaultSettings, type Settings } from "./types";

const key = "settings";

export async function getSettings(): Promise<Settings> {
  const stored = await browser.storage.local.get(key);
  return { ...defaultSettings, ...(stored[key] as Partial<Settings> | undefined) };
}

export async function saveSettings(settings: Settings): Promise<void> {
  await browser.storage.local.set({ [key]: settings });
}
