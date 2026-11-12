import{defineConfig,devices}from"@playwright/test";
export default defineConfig({testDir:"e2e/preview",fullyParallel:true,outputDir:"test-results/preview",timeout:60000,
 projects:[320,375,390,500,768,1440].map(width=>({name:`width-${width}`,use:{...devices["Desktop Chrome"],viewport:{width,height:900},isMobile:width<768,hasTouch:width<768}})),
 use:{baseURL:"http://localhost:3260",launchOptions:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH}:{}},
 webServer:{command:"npm run start -- --hostname 127.0.0.1 --port 3260",url:"http://localhost:3260",reuseExistingServer:false,env:{BETA_FIXTURES:"synthetic",BETA_PREVIEW_DEMO:"true",NEXT_PUBLIC_AUTH_ENABLED:"false",CONSULTATION_BOOKING_ENABLED:"false",CONSULTATION_STRIPE_ENABLED:"false",CHAT_ENABLED:"false",SUBSCRIPTIONS_ENABLED:"false"}}
});
