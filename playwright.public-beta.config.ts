import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "e2e/public-beta", fullyParallel: true, timeout: 45000,
  outputDir: "test-results/public-beta",
  projects: [390, 1440].map(width => ({ name: `public-${width}`, use: { ...devices["Desktop Chrome"], viewport: { width, height: 900 } } })),
  use: { baseURL: "http://localhost:3270", launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH } : {} },
  webServer: { command: "npm run start -- --hostname 127.0.0.1 --port 3270", url: "http://localhost:3270", reuseExistingServer: false,
    env: { VERCEL_ENV: "preview", BETA_PREVIEW_DEMO: "true", BETA_FIXTURES: "synthetic", NEXT_PUBLIC_AUTH_ENABLED: "false", CONSULTATION_BOOKING_ENABLED: "false", CHAT_ENABLED: "false", SUBSCRIPTIONS_ENABLED: "false" } },
});
