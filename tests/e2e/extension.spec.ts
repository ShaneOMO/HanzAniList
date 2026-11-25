import { expect, test, chromium, type BrowserContext } from "@playwright/test";
import path from "node:path";
import fs from "node:fs";

const extensionPath = path.resolve(".output/chrome-mv3");
let context: BrowserContext;

test.beforeAll(async () => {
  const candidates = [
    process.env.CHROME_PATH,
    "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
  ].filter((value): value is string => Boolean(value));
  const executablePath = candidates.find((candidate) => fs.existsSync(candidate));
  context = await chromium.launchPersistentContext("", {
    headless: false,
    executablePath,
    ignoreDefaultArgs: ["--disable-extensions"],
    args: [`--disable-extensions-except=${extensionPath}`, `--load-extension=${extensionPath}`],
  });
});

test.afterAll(async () => {
  await context?.close();
});

test("translates static and dynamic titles without AniList API requests", async () => {
  const page = await context.newPage();
  await context.route("https://api.bgm.tv/**", (route) => route.fulfill({
    contentType: "application/json",
    body: JSON.stringify({ data: [{ id: 999001, name: "確認テスト", name_cn: "确认测试", type: 2 }] }),
  }));
  const apiRequests: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("graphql.anilist.co")) apiRequests.push(request.url());
  });
  await page.route("https://anilist.co/anime/16498/**", (route) => route.fulfill({
    contentType: "text/html",
    body: `<!doctype html><html><body><nav>Overview</nav><input id="filter" placeholder="Filter"><h1>Attack on Titan</h1><a href="/anime/1535/Death-Note/"><span class="title">Death Note</span></a><div id="mount"></div></body></html>`,
  }));
  await page.goto("https://anilist.co/anime/16498/Shingeki-no-Kyojin/");
  await expect(page.locator("h1")).toHaveText("进击的巨人");
  await expect(page.locator("nav")).toHaveText("概览");
  await expect(page.locator(".title")).toHaveText("死亡笔记");
  await page.locator("h1").hover();
  await expect(page.locator(".hanz-tooltip")).toContainText("官方译名");
  await expect(page.locator(".hanz-tooltip")).toContainText("Attack on Titan");
  await page.evaluate(() => {
    const link = document.createElement("a");
    link.href = "/anime/21/One-Piece/";
    link.textContent = "One Piece";
    document.querySelector("#mount")!.append(link);
  });
  await expect(page.locator("#mount a")).toHaveText("航海王");
  await page.evaluate(() => {
    document.querySelector("nav")!.textContent = "anime list";
    document.querySelector("input")!.placeholder = "Write a status...";
    const activity = document.createElement("p");
    activity.textContent = "4 hours ago";
    document.querySelector("#mount")!.append(activity);
    const unknown = document.createElement("a");
    unknown.id = "unknown-title";
    unknown.href = "/anime/999001/test";
    unknown.textContent = "確認テスト";
    document.querySelector("#mount")!.append(unknown);
  });
  await expect(page.locator("nav")).toHaveText("动画列表");
  await expect(page.locator("#filter")).toHaveAttribute("placeholder", "发布一条动态……");
  await expect(page.locator("#mount p")).toHaveText("4 小时前");
  await expect(page.locator("#unknown-title")).toHaveText("确认测试");
  expect(apiRequests).toEqual([]);
});

test("options persist user settings", async () => {
  const worker = context.serviceWorkers()[0] ?? await context.waitForEvent("serviceworker");
  const extensionId = new URL(worker.url()).host;
  const page = await context.newPage();
  await page.goto(`chrome-extension://${extensionId}/options.html`);
  const bilingual = page.locator('input[name="showOriginal"]');
  await expect(bilingual).not.toBeChecked();
  await bilingual.check();
  await expect(page.locator("#status")).toContainText("已保存");
  await page.reload();
  await expect(bilingual).toBeChecked();
});
