import {test,expect} from "@playwright/test";
for(const lang of ["en","zh"] as const){
  test.describe(`${lang} Pricing v3 contract fixtures`,()=>{
    test.beforeEach(async({context,page})=>{
      await context.addCookies([{name:"lang",value:lang,url:"http://localhost:3240"},{name:"synthetic_preview_cookie",value:"present",url:"http://localhost:3240"}]);
      await page.route("**/api/subscriptions/status",r=>r.fulfill({json:{plan:"free",used:0,limit:1,alert_opt_in:false}}));
    });
    test("pricing, unchecked consent and privacy-safe TEST checkout",async({page},info)=>{
      let posts=0;
      await page.route("**/api/subscriptions/checkout",async route=>{
        posts++;const req=route.request();expect(req.headers().referer).toBeUndefined();expect(req.headers().cookie).toContain("synthetic_preview_cookie=present");
        expect(req.postDataJSON()).toEqual({plan:"basic",consent:true});await route.fulfill({status:503,json:{error:"unavailable"}});
      });
      await page.goto("/pricing?email=synthetic-sensitive");
      await expect(page.getByText("$0",{exact:true})).toBeVisible();await expect(page.getByText("$4.99",{exact:true})).toBeVisible();await expect(page.getByText("$9.99",{exact:true})).toBeVisible();
      await expect(page.getByRole("checkbox").first()).not.toBeChecked();
      const basic=page.getByRole("button",{name:lang==="en"?"Choose TEST plan — Basic":"选择 TEST 测试方案 — 基础",exact:true});await expect(basic).toBeDisabled();
      expect(posts).toBe(0);await page.getByRole("checkbox").first().check();await basic.click();await expect(page.getByText(lang==="en"?/Unable to start checkout/:/无法开始结账/)).toBeVisible();expect(posts).toBe(1);
      expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
      await page.screenshot({path:info.outputPath(`pricing-v3-${lang}-${info.project.name}.png`),fullPage:true});
    });
    test("chat success, quota upgrade and literal provider text without replay",async({page},info)=>{
      let calls=0;
      await page.route("**/api/chat",async route=>{
        calls++;expect(route.request().headers().referer).toBeUndefined();expect(route.request().headers().cookie).toContain("synthetic_preview_cookie=present");
        const data=route.request().postDataJSON();expect(Object.keys(data).sort()).toEqual(["consent","question","requestId"]);
        await route.fulfill(calls===1?{json:{answer:'Synthetic FAQ answer: Official applications are free. Verify current rules at NYC Housing Connect.',source:"faq",usage:{plan:"free",used:1,limit:1}}}:{status:429,json:{error:"quota"}});
      });
      await page.goto("/chat?ssn=synthetic-sensitive");
      const send=page.getByRole("button",{name:lang==="en"?"Send question":"发送问题",exact:true});await expect(send).toBeDisabled();
      await page.getByRole("textbox").fill("Where is the official application site?");await page.getByRole("checkbox").check();await send.click();
      await expect(page.getByText(/Synthetic FAQ answer/)).toBeVisible();await expect(page.locator('article img')).toHaveCount(0);await expect(page.getByText(/1\/1/)).toBeVisible();
      await page.getByRole("textbox").fill("What is AMI?");await send.click();await expect(page.locator('main [role="alert"]')).toContainText(lang==="en"?"daily allowance":"今日消息额度");
      await page.screenshot({path:info.outputPath(`chat-v3-${lang}-${info.project.name}.png`),fullPage:true});
      await page.reload();await expect(page.getByText(/Synthetic FAQ answer/)).toHaveCount(0);expect(await page.evaluate(()=>Object.keys(sessionStorage))).toEqual([]);
    });
    test("provider failures and obvious personal identifiers do not show a charged message",async({page})=>{
      let calls=0;await page.route("**/api/chat",async r=>{calls++;await r.fulfill({status:503,json:{error:"unavailable"}});});
      await page.goto("/chat");await page.getByRole("checkbox").check();await page.getByRole("textbox").fill("SSN 123-45-6789");await page.getByRole("button",{name:lang==="en"?"Send question":"发送问题",exact:true}).click();expect(calls).toBe(0);
      await page.getByRole("textbox").fill("General housing question");await page.getByRole("button",{name:lang==="en"?"Send question":"发送问题",exact:true}).click();await expect(page.locator('main [role="alert"]')).toContainText(lang==="en"?"Provider errors do not consume":"服务错误不会扣除");await expect(page.getByText(/0\/1/)).toBeVisible();expect(calls).toBe(1);
    });
  });
}
test("GTM remains silent without consent; events exclude URL/query/content; visit IDs are document scoped",async({page,context})=>{
  await page.route("**/api/analytics/milestones",r=>r.fulfill({json:{registration:true,activation:true,plan:"basic"}}));
  await page.goto("/?email=synthetic-sensitive");expect(await page.evaluate(()=> (window as Window & {dataLayer?:unknown[]}).dataLayer)).toBeUndefined();
  await page.getByRole("button",{name:"Allow anonymous analytics"}).click();
  await expect.poll(()=>page.evaluate(()=> (window as Window & {dataLayer?:unknown[]}).dataLayer?.length??0)).toBeGreaterThanOrEqual(1);
  await expect.poll(()=>page.evaluate(()=> (window as unknown as {dataLayer:{event:string}[]}).dataLayer.map(e=>e.event))).toEqual(expect.arrayContaining(["account_registration","subscription_activated"]));
  const original=await page.evaluate(()=> (window as unknown as {dataLayer:Record<string,unknown>[]}).dataLayer);
  expect(JSON.stringify(original)).not.toContain("synthetic-sensitive");expect(Object.keys(original[0]).sort()).toEqual(["channel","event","language","schema_version","visit_id"]);
  const tab=await context.newPage();await tab.goto("/");await expect.poll(()=>tab.evaluate(()=> (window as Window & {dataLayer?:unknown[]}).dataLayer?.length??0)).toBeGreaterThanOrEqual(1);
  const next=await tab.evaluate(()=> (window as unknown as {dataLayer:Record<string,unknown>[]}).dataLayer[0].visit_id);expect(next).not.toBe(original[0].visit_id);await tab.close();
  await page.getByRole("button",{name:"Decline / withdraw consent"}).click();const before=await page.evaluate(()=> (window as unknown as {dataLayer:unknown[]}).dataLayer.length);if((page.viewportSize()?.width??0)<768){await page.getByRole("button",{name:"Open menu"}).click();await page.getByRole("dialog").getByRole("link",{name:"Plans",exact:true}).click();}else{await page.getByRole("link",{name:"Plans",exact:true}).click();}expect(await page.evaluate(()=> (window as unknown as {dataLayer:unknown[]}).dataLayer.length)).toBe(before);
});

test("provider answer markup is displayed as literal text",async({page})=>{
  await page.route("**/api/subscriptions/status",r=>r.fulfill({json:{plan:"free",used:0,limit:1}}));
  await page.route("**/api/chat",r=>r.fulfill({json:{answer:'<img src=x onerror="window.syntheticXss=true">',source:"gemini",usage:{plan:"free",used:1,limit:1}}}));
  await page.goto("/chat");await page.getByRole("textbox").fill("Generic question");await page.getByRole("checkbox").check();await page.getByRole("button",{name:"Send question",exact:true}).click();
  await expect(page.locator("article")).toContainText('<img src=x onerror="window.syntheticXss=true">');await expect(page.locator("article img")).toHaveCount(0);expect(await page.evaluate(()=> (window as unknown as {syntheticXss?:boolean}).syntheticXss)).toBeUndefined();
});
