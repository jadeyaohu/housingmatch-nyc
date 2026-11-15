import { defineConfig } from "@playwright/test";
import base from "./playwright.public-beta.config";
export default defineConfig({
  ...base,
  testDir: "e2e/property-media",
  testMatch: "property-media.spec.ts",
  webServer: {
    command: "npm run start -- --hostname 127.0.0.1 --port 3270",
    url: "http://localhost:3270", reuseExistingServer: false,
    env: { VERCEL_ENV: "preview", BETA_PREVIEW_DEMO: "false", BETA_FIXTURES: "", NEXT_PUBLIC_AUTH_ENABLED: "false", CONSULTATION_BOOKING_ENABLED: "false", CHAT_ENABLED: "false", SUBSCRIPTIONS_ENABLED: "false" },
  },
});
