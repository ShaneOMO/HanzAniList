import { defineConfig } from "wxt";

export default defineConfig({
  manifest: {
    name: "HanzAniList · AniList 简体中文",
    description: "汉化 AniList 界面，并以离线译名库显示动漫和漫画中文名。",
    permissions: ["storage"],
    host_permissions: ["https://anilist.co/*"],
    web_accessible_resources: [
      {
        resources: ["titles/*"],
        matches: ["https://anilist.co/*"],
      },
    ],
    options_ui: {
      page: "options.html",
      open_in_tab: true,
    },
  },
  webExt: {
    disabled: true,
  },
});
