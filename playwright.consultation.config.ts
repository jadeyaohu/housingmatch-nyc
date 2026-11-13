import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e/consultation",
  fullyParallel: true,
  use: { baseURL: "http://127.0.0.1:3210", ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ? { launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH } } : {}) },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: {width:1440,height:900} } },
    { name: "mobile", use: { ...devices["iPhone 13"], defaultBrowserType: "chromium" } },
  ],
  outputDir: "test-results/consultation",
  webServer: {
    command: "node scripts/consultation-browser-fixture.mjs",
    url: "http://127.0.0.1:3210/consultation", reuseExistingServer: false, timeout: 120000,
    // Real local SQL/Next handlers; fake Auth verification and in-memory synthetic email sink only.
    env: { BETA_FIXTURES: "synthetic" },
  },
});
