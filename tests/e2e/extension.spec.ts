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
  const apiRequests: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("graphql.anilist.co")) apiRequests.push(request.url());
  });
  await page.route("https://anilist.co/anime/16498/**", (route) => route.fulfill({
    contentType: "text/html",
    body: `<!doctype html><html><body><nav>Overview</nav><h1>Attack on Titan</h1><a href="/anime/1535/Death-Note/"><span class="title">Death Note</span></a><div id="mount"></div></body></html>`,
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
