import "./content/style.css";
import { ContentController } from "../src/content-controller";
import { getSettings } from "../src/settings";
import { TitleClient } from "../src/title-client";
import { TitleTooltip } from "../src/title-tooltip";

export default defineContentScript({
  matches: ["https://anilist.co/*"],
  runAt: "document_idle",
  async main() {
    const settings = await getSettings();
    if (!settings.uiTranslation && !settings.titleTranslation) return;
    new TitleTooltip(document);
    new ContentController(settings, new TitleClient(), window).start();
  },
});
