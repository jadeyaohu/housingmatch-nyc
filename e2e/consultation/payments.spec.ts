import { test, expect } from "@playwright/test";
const capability = "t".repeat(43);
for (const lang of ["en", "zh"] as const) {
  test.describe(`payments ${lang}`, () => {
    test.beforeEach(async ({ context }) => { await context.addCookies([{ name: "lang", value: lang, url: "http://127.0.0.1:3210" }]); });
    test("private invitation authorizes only fixed-price checkout and removes URL fragment", async ({ page }, info) => {
      const requests: string[] = [];
      page.on("request", r => requests.push(r.url()));
      await page.route("**/api/consultation/payments/status", async route => {
        expect(route.request().headers().authorization).toBe(`Bearer ${capability}`);
        expect(route.request().headers().referer).toBeUndefined();
        await route.fulfill({ json: { state: "issued", package: "standard", amount: 5900, currency: "usd", bookingStatus: "requested" } });
      });
      await page.goto(`/consultation/pay#token=${capability}`);
      await expect(page.getByRole("heading", { level: 2 })).toHaveText(lang === "en" ? "Invitation ready" : "付款邀请已就绪");
      expect(new URL(page.url()).hash).toBe(""); expect(requests.every(url => !url.includes(capability))).toBe(true);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.screenshot({ path: info.outputPath(`invitation-${lang}-${info.project.name}.png`), fullPage: true });
      let calls = 0;
      await page.route("**/api/consultation/payments/checkout", async route => {
        calls++; expect(route.request().postData()).toBeNull(); expect(route.request().headers().authorization).toBe(`Bearer ${capability}`);
        await route.fulfill({ status: 503, json: { error: "unavailable" } });
      });
      await page.getByRole("button", { name: lang === "en" ? "Continue to Stripe test Checkout" : "前往 Stripe 测试收银台" }).click();
      await expect(page.locator('section [role="alert"]')).toBeVisible(); expect(calls).toBe(1);
    });
    test("success/cancel redirects cannot assert payment or appointment confirmation", async ({ page }, info) => {
      await page.route("**/api/consultation/payments/status", route => route.fulfill({ json: { state: "pending", package: "expert", amount: 9900, currency: "usd", bookingStatus: "requested" } }));
      await page.goto("/consultation/pay/result?outcome=success&paid=true&session_id=cs_test_untrusted");
      await expect(page.getByRole("heading", { level: 2 })).toHaveText(lang === "en" ? "Payment pending" : "付款处理中");
      await expect(page.getByText(lang === "en" ? "Appointment not confirmed." : "预约尚未确认。", { exact: true })).toBeVisible();
      expect(new URL(page.url()).search).toBe("");
      await page.screenshot({ path: info.outputPath(`pending-${lang}-${info.project.name}.png`), fullPage: true });
      await page.route("**/api/consultation/payments/status", route => route.fulfill({ json: { state: "paid", package: "expert", amount: 9900, currency: "usd", bookingStatus: "requested", refundStatus: "pending" } }));
      await page.getByRole("button", { name: lang === "en" ? "Check payment status" : "查询付款状态" }).click();
      await expect(page.getByRole("heading", { level: 2 })).toHaveText(lang === "en" ? "Test payment received" : "已收到测试付款");
      await expect(page.getByText(lang === "en" ? "Appointment not confirmed." : "预约尚未确认。", { exact: true })).toBeVisible();
      await page.screenshot({ path: info.outputPath(`paid-${lang}-${info.project.name}.png`), fullPage: true });
      await page.route("**/api/consultation/payments/status", route => route.fulfill({ json: { state: "refunded", package: "expert", amount: 9900, currency: "usd", bookingStatus: "requested", refundStatus: "succeeded" } }));
      await page.getByRole("button", { name: lang === "en" ? "Check payment status" : "查询付款状态" }).click();
      await expect(page.getByRole("heading", { level: 2 })).toHaveText(lang === "en" ? "Full test refund confirmed" : "已确认全额测试退款");
    });
    test("expired invitation and failure are distinct from paid", async ({ page }) => {
      await page.route("**/api/consultation/payments/status", route => route.fulfill({ status: 410, json: { error: "expired" } }));
      await page.goto(`/consultation/pay#token=${capability}`);
      await expect(page.locator('section [role="alert"]')).toBeVisible();
      await expect(page.getByRole("button", { name: lang === "en" ? "Continue to Stripe test Checkout" : "前往 Stripe 测试收银台" })).toHaveCount(0);
      await page.route("**/api/consultation/payments/status", route => route.fulfill({ json: { state: "failed", package: "standard", amount: 5900, currency: "usd", bookingStatus: "requested" } }));
      await page.getByRole("button", { name: lang === "en" ? "Check payment status" : "查询付款状态" }).click();
      await expect(page.getByRole("heading", { level: 2 })).toHaveText(lang === "en" ? "Payment was not completed" : "付款未完成");
    });
  });
}

test("copied return tabs keep their own attempt selector even with multiple payment cookies", async ({ context }) => {
  const ids = ["f053e2b1-65c1-46db-b0c9-aa49ae28d6c1", "da7606dc-51ef-4cb0-9918-18c8e20531aa"];
  await context.addCookies(ids.map((id, i) => ({ name: `consultation_payment_${id}`, value: String(i).repeat(43), url: "http://127.0.0.1:3210", httpOnly: true })));
  for (const id of ids) {
    const page = await context.newPage();
    await page.route("**/api/consultation/payments/status", async route => {
      expect(route.request().headers()["x-consultation-attempt"]).toBe(id);
      await route.fulfill({ json: { attemptId: id, state: "pending", package: "standard", amount: 5900, currency: "usd", bookingStatus: "requested" } });
    });
    await page.goto(`/consultation/pay/result?attempt=${id}`);
    await expect(page.getByRole("heading", { level: 2 })).toHaveText("Payment pending");
    expect(new URL(page.url()).searchParams.get("attempt")).toBe(id);
    await page.reload(); await expect(page.getByRole("heading", { level: 2 })).toHaveText("Payment pending");
    await page.close();
  }
});
