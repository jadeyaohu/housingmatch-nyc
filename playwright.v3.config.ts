import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir:"e2e/v3",fullyParallel:true,outputDir:"test-results/v3",
  projects:[{name:"desktop-1440",use:{...devices["Desktop Chrome"],viewport:{width:1440,height:900}}},{name:"mobile-390",use:{...devices["Desktop Chrome"],viewport:{width:390,height:844},isMobile:true,hasTouch:true}}],
  use:{baseURL:"http://localhost:3240",launchOptions:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH}:{}},
  webServer:{command:"npm run start -- --hostname 127.0.0.1 --port 3240",url:"http://localhost:3240",reuseExistingServer:false,env:{
    BETA_FIXTURES:"synthetic",NEXT_PUBLIC_AUTH_ENABLED:"true",NEXT_PUBLIC_AUTH_SUPABASE_URL:"http://127.0.0.1:54321",NEXT_PUBLIC_AUTH_SUPABASE_KEY:"synthetic-public-placeholder",NEXT_PUBLIC_EMAIL_AUTH:"1",
    BETA_SERVICES_ENABLED:"true",BETA_NONPRODUCTION_APPROVED:"true",BETA_APP_ORIGIN:"http://localhost:3240",BETA_SUPABASE_URL:"http://127.0.0.1:54321",BETA_SUPABASE_SERVICE_ROLE_KEY:"synthetic-placeholder",
    CHAT_ENABLED:"true",CHAT_UPSTREAM_REVIEWED:"true",CHAT_DATA_POLICY_APPROVED:"true",CHAT_APPS_SCRIPT_URL:"https://script.google.com/macros/s/synthetic-contract/exec",
    SUBSCRIPTIONS_ENABLED:"true",SUBSCRIPTIONS_STRIPE_SECRET_KEY:"sk_test_synthetic_fixture_only",SUBSCRIPTIONS_STRIPE_WEBHOOK_SECRET:"whsec_synthetic_fixture_only",
  }},
});
