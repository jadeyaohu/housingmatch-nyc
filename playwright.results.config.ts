import { defineConfig, devices } from "@playwright/test";

/**
 * Issue #5 Phase A — real-browser regressions for matcher results (Chromium, desktop + mobile).
 * /api/match is intercepted with page.route() and answered with engine output for SYNTHETIC
 * fixtures (src/lib/matching/fixtures/hn5.ts). No test-only app code, env var or data path.
 * Separate file name/port from PR #4's playwright.config.ts so the two never conflict.
 */
const PORT = Number(process.env.E2E_RESULTS_PORT ?? 3220);
const executablePath = process.env.PW_CHROMIUM_PATH || undefined; // local sandbox override

export default defineConfig({
  testDir: "e2e/results",
  timeout: 60_000,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["github"]] : "list",
  use: { baseURL: `http://localhost:${PORT}` },
  projects: [
    { name: "chromium-desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 900 }, launchOptions: { executablePath } } },
    {
      name: "chromium-mobile",
      use: { ...devices["Desktop Chrome"], viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2, launchOptions: { executablePath } },
    },
  ],
  webServer: { command: `npx next start -p ${PORT}`, url: `http://localhost:${PORT}`, reuseExistingServer: false, timeout: 60_000 },
});
