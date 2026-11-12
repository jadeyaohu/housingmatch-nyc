import { expect,test } from "@playwright/test";
for(const lang of ["en","zh"] as const){
 test.describe(lang,()=>{
  test.beforeEach(async({context})=>{await context.addCookies([{name:"lang",value:lang,url:"http://localhost:3230"}]);});
  test("directory has labeled licensed representative photos, safe links, filters and separate secondary inventory",async({page},info)=>{
   await page.goto("/listings");
   const cards=page.getByTestId("directory-card");await expect(cards).toHaveCount(2);
   await expect(cards.first().locator("figcaption")).toContainText(lang==="en"?"not this building":"非该楼盘实拍");
   await expect(cards.first().getByRole("link").last()).toHaveAttribute("href","https://housingconnect.nyc.gov/PublicWeb/");
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
   await page.screenshot({path:info.outputPath(`directory-${lang}-${info.project.name}.png`),fullPage:true});
   await page.locator('input[name=q]').fill("Cedar");await page.getByRole("button",{name:lang==="en"?"Apply":"应用",exact:true}).click();await expect(cards).toHaveCount(1);
   await page.goto("/listings?type=waitlist");await expect(cards).toHaveCount(1);await expect(cards.first().locator('[data-availability="unverified"]')).toBeVisible();
   await expect(page.getByTestId("rerental-banner")).toBeVisible();
  });
  test("free signup requires explicit consent and only synthetic intercepted mail",async({page})=>{
   await page.goto("/signup");const send=page.locator('form button');await expect(send).toBeDisabled();
   await page.getByTestId("account-consent").check();await expect(send).toBeEnabled();
   await page.route("http://127.0.0.1:54321/auth/v1/otp**",r=>r.fulfill({json:{}}));
   await page.locator('input[type=email]').fill("synthetic@example.test");await send.click();await expect(page.getByTestId("signup-sent")).toBeVisible();
  });
  test("native intake default OFF, chat and subscriptions preserve the free quiz",async({page})=>{
   await page.goto("/consultation/book");await expect(page.locator('input[name=name]')).toBeDisabled();
   await page.goto("/consultation/pay");await expect(page).toHaveURL(/\/consultation$/);
   await page.goto("/chat");await expect(page.getByRole("textbox")).toBeDisabled();
   await page.goto("/pricing");await expect(page.getByRole("button",{name:lang==="en"?"Choose TEST plan — Basic":"选择 TEST 测试方案 — 基础",exact:true})).toBeDisabled();
   await page.goto("/quiz");await expect(page.getByTestId("quiz")).toBeVisible();
  });
 });
}
test("actual synthetic match handler keeps unknown income in NEEDS_REVIEW and secondary counts separate",async({request})=>{
 const r=await request.post("/api/match",{data:{size:3,annualIncome:60000}});expect(r.status()).toBe(200);
 const b=await r.json();expect(b.results.map((r:{listing:{id:string}})=>r.listing.id)).toEqual(expect.arrayContaining(["demo-exact","demo-range"]));
 expect(b.results.find((r:{listing:{id:string}})=>r.listing.id==="demo-range").result.status).toBe("NEEDS_REVIEW");
 expect(b.rerentals).toHaveLength(2);
});
