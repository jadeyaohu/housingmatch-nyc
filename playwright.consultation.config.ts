import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e/consultation",
  fullyParallel: true,
  use: { baseURL: "http://127.0.0.1:3210", ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ? { launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH } } : {}) },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["iPhone 13"], defaultBrowserType: "chromium" } },
  ],
  outputDir: "test-results/consultation",
  webServer: {
    command: "npm run start -- --hostname 127.0.0.1 --port 3210",
    url: "http://127.0.0.1:3210/consultation", reuseExistingServer: false, timeout: 120000,
    // Old enablement flags deliberately remain set to verify the retired routes cannot be reactivated.
    // No local/remote database or external form submission is used.
    env: { BETA_FIXTURES: "synthetic", CONSULTATION_BOOKING_ENABLED: "true", CONSULTATION_POLICIES_APPROVED: "true", CONSULTATION_SUPABASE_URL: "http://127.0.0.1:9", CONSULTATION_SUPABASE_SERVICE_ROLE_KEY: "synthetic-browser-test-placeholder" },
  },
});
