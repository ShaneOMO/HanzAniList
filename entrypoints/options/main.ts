import { getSettings, saveSettings } from "../../src/settings";
import type { Settings } from "../../src/types";

const form = document.querySelector<HTMLFormElement>("#settings")!;
const status = document.querySelector<HTMLParagraphElement>("#status")!;
const keys: Array<keyof Settings> = ["uiTranslation", "titleTranslation", "bangumiSearch", "showOriginal", "aiTranslations"];
const settings = await getSettings();

for (const key of keys) {
  const input = form.elements.namedItem(key) as HTMLInputElement;
  input.checked = settings[key];
  input.addEventListener("change", async () => {
    const updated = { ...settings, [key]: input.checked };
    Object.assign(settings, updated);
    await saveSettings(updated);
    status.textContent = "已保存，请刷新 AniList 页面。";
  });
}
