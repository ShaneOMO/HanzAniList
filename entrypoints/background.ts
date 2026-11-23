import { browser } from "wxt/browser";

export default defineBackground(() => {
  browser.runtime.onInstalled.addListener(({ reason }) => {
    if (reason === "update") indexedDB.deleteDatabase("hanz-anilist");
  });
});
