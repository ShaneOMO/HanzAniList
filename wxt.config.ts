import { defineConfig } from "wxt";

export default defineConfig({
  manifest: {
    name: "HanzAniList · AniList 简体中文",
    description: "汉化 AniList 界面，并以离线译名库显示动漫和漫画中文名。",
    permissions: ["storage"],
    host_permissions: ["https://anilist.co/*", "https://api.bgm.tv/*"],
    action: {
      default_title: "打开 HanzAniList 设置",
    },
    browser_specific_settings: {
      gecko: {
        id: "hanzanilist@shaneomo.github.io",
        strict_min_version: "128.0",
        data_collection_permissions: {
          required: ["none"],
        },
      },
    },
    options_ui: {
      page: "options.html",
      open_in_tab: true,
    },
  },
  webExt: {
    disabled: true,
  },
});
