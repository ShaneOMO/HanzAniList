import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 60_000,
  workers: 1,
  use: {
    headless: false,
    viewport: { width: 1280, height: 900 },
  },
});
