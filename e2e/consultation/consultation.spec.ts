import {test,expect} from "@playwright/test";
for(const lang of ["en","zh"] as const){
 test.describe(`native ${lang}`,()=>{
  test.beforeEach(async({context})=>{await context.addCookies([{name:"lang",value:lang,url:"http://127.0.0.1:3210"},{name:"synthetic_preview_cookie",value:"present",url:"http://127.0.0.1:3210"}]);});
  test("native pricing/form → real local SQL → acknowledgment → manual TEST verification → scheduling",async({page,request},info)=>{
   await page.goto("/consultation");
   await expect(page.getByRole("heading",{level:1})).toHaveText(lang==="en"?"Want personalized guidance on your housing applications?":"纽约可负担住房申请太复杂？让专业顾问帮你梳理！");
   await expect(page.getByText("$59",{exact:true})).toBeVisible();await expect(page.getByText("$99",{exact:true})).toBeVisible();
   await expect(page.locator('a[href*="docs.google.com/forms"]')).toHaveCount(0);
   await page.screenshot({path:info.outputPath(`native-pricing-${lang}-${info.project.name}.png`),fullPage:true});
   const expert=page.getByRole("link",{name:lang==="en"?"Book a Consultation — In-Depth Expert Review":"预约一对一咨询 — 深度专家评估",exact:true});await expert.click();
   await expect(page.locator('select[name=package]')).toHaveValue("expert");
   await expect(page.locator('input[name=termsAccepted]')).not.toBeChecked();await expect(page.locator('input[name=privacyAccepted]')).not.toBeChecked();
   await page.locator('input[name=name]').fill("Synthetic Person");await page.locator('input[name=email]').fill("synthetic@example.test");
   await page.locator('input[name=preferredLocal]').fill(new Date(Date.now()+10*86400000).toISOString().slice(0,16));
   await page.screenshot({path:info.outputPath(`native-form-${lang}-${info.project.name}.png`),fullPage:true});
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
   const pendingRequest=page.waitForRequest(r=>r.url().endsWith('/api/consultation/bookings')&&r.method()==='POST');
   await page.locator('input[name=termsAccepted]').check();await page.locator('input[name=privacyAccepted]').check();
   const response=page.waitForResponse(r=>r.url().endsWith('/api/consultation/bookings')&&r.request().method()==='POST');
   await page.getByRole("button",{name:lang==="en"?"Send booking request":"提交咨询申请",exact:true}).click();
   const submitted=await pendingRequest,payload=submitted.postDataJSON(),headers=await submitted.allHeaders();expect(payload).not.toHaveProperty("priceCents");expect(headers.referer || "").toBe("");expect(headers.cookie).toContain("synthetic_preview_cookie=present");
   const receipt=await (await response).json();expect(receipt.id).not.toBe(payload.submissionKey);expect(receipt.status).toBe("awaiting_payment");expect(receipt.paymentStatus).toBe("pending");expect(receipt.acknowledgment).toBe("sent");
   await expect(page.locator('main [role=status]')).toContainText(lang==="en"?"Awaiting Payment":"等待付款");
   await page.screenshot({path:info.outputPath(`native-receipt-${lang}-${info.project.name}.png`),fullPage:true});
   const state=()=>request.get(`http://127.0.0.1:3250/test/state/${receipt.id}`).then(r=>r.json());
   let result=await state();expect(result.booking.status).toBe("awaiting_payment");expect(result.messages).toHaveLength(1);
   const retry=await request.post('/api/consultation/bookings',{headers:{Origin:"http://127.0.0.1:3210"},data:payload});expect(retry.status()).toBe(201);expect((await retry.json()).id).toBe(receipt.id);expect((await state()).messages).toHaveLength(1);
   const ack=result.messages[0].message;expect(ack.subject).toContain(lang==="en"?"Awaiting Payment":"等待付款");expect(ack.text).toContain("$99 / 60");expect(ack.text).toContain(lang==="en"?"Human-reviewed written report":"经人工审核的书面报告");expect(ack.text).toContain(lang==="en"?"Do not pay":"请勿付款");expect(ack.text).not.toContain("schedule.example.test");
   const verify={requestId:receipt.id,amountCents:9900,currency:"usd",reference:`SYNTHETIC_${receipt.id}`,verified:true};
   expect((await request.post('/api/consultation/requests/verify-payment',{headers:{Origin:"http://127.0.0.1:3210"},data:verify})).status()).toBe(403);
   const operator={Origin:"http://127.0.0.1:3210",Authorization:"Bearer synthetic-admin-token"};
   expect((await request.post('/api/consultation/requests/verify-payment',{headers:operator,data:{...verify,amountCents:5900}})).status()).toBe(409);
   expect((await request.post('/api/consultation/requests/verify-payment',{headers:operator,data:verify})).status()).toBe(200);
   result=await state();expect(result.booking.status).toBe("scheduling_invited");expect(result.booking.bookingStatus).toBe("requested");expect(result.messages).toHaveLength(2);expect(result.messages[1].message.text).toContain("https://schedule.example.test/synthetic-booking");
   expect((await request.post('/api/consultation/requests/verify-payment',{headers:operator,data:verify})).status()).toBe(200);expect((await state()).messages).toHaveLength(2);
   const replay=await request.post('/api/consultation/bookings',{headers:{Origin:"http://127.0.0.1:3210"},data:payload});expect((await replay.json()).status).toBe("scheduling_invited");
  });
 });
}

test("selected email language can differ from the website; Standard package is $59",async({page,request})=>{
 await page.goto('/consultation/book?package=standard');await page.locator('input[name=name]').fill('Synthetic Language Test');await page.locator('input[name=email]').fill('second@example.test');await page.locator('select[name=language]').selectOption('zh');await page.locator('input[name=preferredLocal]').fill(new Date(Date.now()+10*86400000).toISOString().slice(0,16));await page.locator('input[name=termsAccepted]').check();await page.locator('input[name=privacyAccepted]').check();
 const response=page.waitForResponse(r=>r.url().endsWith('/api/consultation/bookings')&&r.request().method()==='POST');await page.getByRole('button',{name:'Send booking request',exact:true}).click();const receipt=await(await response).json();expect(receipt.status).toBe('awaiting_payment');
 const state=await(await request.get(`http://127.0.0.1:3250/test/state/${receipt.id}`)).json();expect(state.messages).toHaveLength(1);expect(state.messages[0].message.subject).toContain('等待付款');expect(state.messages[0].message.text).toContain('$59 / 30');expect(state.messages[0].message.text).not.toContain('schedule.example.test');
});
