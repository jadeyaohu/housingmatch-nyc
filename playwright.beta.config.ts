import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir:"e2e/beta", fullyParallel:true, outputDir:"test-results/beta",
  projects:[{name:"desktop-1440",use:{...devices["Desktop Chrome"],viewport:{width:1440,height:900}}},{name:"mobile-390",use:{...devices["Desktop Chrome"],viewport:{width:390,height:844},isMobile:true,hasTouch:true}}],
  use:{baseURL:"http://localhost:3230",launchOptions:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH}:{}},
  webServer:{command:"npm run start -- --hostname 127.0.0.1 --port 3230",url:"http://localhost:3230",reuseExistingServer:false,env:{BETA_FIXTURES:"synthetic",NEXT_PUBLIC_AUTH_ENABLED:"true",NEXT_PUBLIC_AUTH_SUPABASE_URL:"http://127.0.0.1:54321",NEXT_PUBLIC_AUTH_SUPABASE_KEY:"synthetic-public-placeholder",NEXT_PUBLIC_EMAIL_AUTH:"1",CONSULTATION_BOOKING_ENABLED:"false",CONSULTATION_STRIPE_ENABLED:"false"}},
});
