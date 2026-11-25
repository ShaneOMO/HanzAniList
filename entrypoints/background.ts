import { browser } from "wxt/browser";
import { TitleRepository } from "../src/title-repository";
import { registerTitleService } from "../src/title-service";
import { registerBangumiService } from "../src/bangumi-service";

export default defineBackground(() => {
  const titles = new TitleRepository();
  registerTitleService(titles);
  registerBangumiService(titles);
  browser.action.onClicked.addListener(() => browser.runtime.openOptionsPage());
  browser.runtime.onInstalled.addListener(({ reason }) => {
    if (reason === "update") indexedDB.deleteDatabase("hanz-anilist");
  });
});
