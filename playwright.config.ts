import { defineConfig, devices } from "@playwright/test";

/**
 * Real-browser regression tests for HN-001 PR 1b (Chromium).
 * Requires a build made with NEXT_PUBLIC_ANALYTICS_ENABLED=true (see the CI "e2e" job).
 * /api/events is NOT mocked: requests hit the real route, which returns 204 because
 * ANALYTICS_INGEST_ENABLED is unset — so nothing is stored anywhere.
 */
const PORT = Number(process.env.E2E_PORT ?? 3210);
const AUTH_PORT = Number(process.env.E2E_AUTH_PORT ?? 3211);
const executablePath = process.env.PW_CHROMIUM_PATH || undefined; // local sandbox override

export default defineConfig({
  testDir: "e2e",
  timeout: 60_000,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["github"]] : "list",
  use: { baseURL: `http://localhost:${PORT}`, launchOptions: { executablePath } },
  projects: [
    { name: "chromium-desktop", use: { ...devices["Desktop Chrome"], launchOptions: { executablePath } } },
    {
      name: "chromium-mobile",
      use: { ...devices["Desktop Chrome"], viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2, launchOptions: { executablePath } },
    },
  ],
  webServer: [
    { command: `npx next start -p ${PORT}`, url: `http://localhost:${PORT}`, reuseExistingServer: false, timeout: 60_000 },
    // Test-only cookie-protected front door (stand-in for Vercel Authentication).
    { command: "node e2e/auth-proxy.mjs", port: AUTH_PORT, reuseExistingServer: false, timeout: 30_000, env: { E2E_PORT: String(PORT), E2E_AUTH_PORT: String(AUTH_PORT) } },
  ],
});
