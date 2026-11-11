import { test, expect } from "@playwright/test";

for (const lang of ["en", "zh"] as const) {
  test.describe(lang, () => {
    test.beforeEach(async ({ context }) => {
      await context.addCookies([{ name: "lang", value: lang, url: "http://127.0.0.1:3210" }]);
    });
    test("correct pricing, free access, policies and responsive UI", async ({ page }, info) => {
      await page.goto("/consultation");
      await expect(page.getByText("$59", { exact: true })).toBeVisible();
      await expect(page.getByText("$99", { exact: true })).toBeVisible();
      await expect(page.locator("h2").filter({ hasText: lang === "en" ? "Standard Consultation" : "标准咨询" })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.screenshot({ path: info.outputPath(`pricing-${lang}-${info.project.name}.png`), fullPage: true });
      for (const path of ["/consultation/terms", "/consultation/cancellation", "/privacy"]) {
        await page.goto(path); await expect(page.locator("h1")).toBeVisible();
        await expect(page.getByText(/pending founder approval|待创始人批准/)).toBeVisible();
      }
      await page.goto("/");
      await expect(page.getByTestId("hero-cta")).toBeVisible();
      await expect(page.getByRole("link", { name: lang === "en" ? "Browse housing" : "浏览房源", exact: true })).toBeVisible();
      await page.goto("/listings"); await expect(page.locator("h1")).toBeVisible();
    });
    test("pricing and form fit narrow mobile and tablet widths", async ({ page }) => {
      for (const width of [320, 375, 768]) {
        await page.setViewportSize({ width, height: 900 });
        for (const path of ["/consultation", "/consultation/book"]) {
          await page.goto(path);
          expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
          await expect(page.locator("h1")).toBeVisible();
        }
      }
    });
    test("consent unchecked; mock request success never promises confirmation or payment", async ({ page }, info) => {
      await page.goto("/consultation/book?package=expert");
      await expect(page.locator('select[name="package"]')).toHaveValue("expert");
      await expect(page.locator('input[name="termsAccepted"]')).not.toBeChecked();
      await expect(page.locator('input[name="privacyAccepted"]')).not.toBeChecked();
      await page.screenshot({ path: info.outputPath(`booking-${lang}-${info.project.name}.png`), fullPage: true });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.locator('input[name="name"]').fill("Synthetic Person");
      await page.locator('input[name="email"]').fill("synthetic@example.test");
      await page.locator('input[name="preferredLocal"]').fill(new Date(Date.now() + 10 * 86400000).toISOString().slice(0, 16));
      let posts = 0;
      await page.route("**/api/consultation/bookings", async (route) => {
        posts++;
        const body = route.request().postDataJSON();
        expect(body.termsAccepted).toBe(true); expect(body.privacyAccepted).toBe(true);
        expect(body).not.toHaveProperty("priceCents"); expect(body).not.toHaveProperty("paymentStatus");
        expect(route.request().headers().referer).toBeUndefined();
        await route.fulfill({ json: { id: body.requestId, status: "requested", paymentStatus: "not_started" }, status: 201 });
      });
      await page.getByRole("button", { name: lang === "en" ? "Send booking request" : "提交咨询申请", exact: true }).click();
      expect(posts).toBe(0);
      await page.locator('input[name="termsAccepted"]').check(); await page.locator('input[name="privacyAccepted"]').check();
      await page.getByRole("button", { name: lang === "en" ? "Send booking request" : "提交咨询申请", exact: true }).click();
      await expect(page.getByRole("heading", { name: lang === "en" ? "Booking request received" : "已收到咨询申请" })).toBeVisible();
      await expect(page.getByText(/appointment is not yet confirmed|预约尚未确认/)).toBeVisible();
      expect(posts).toBe(1);
      await page.screenshot({ path: info.outputPath(`request-received-${lang}-${info.project.name}.png`), fullPage: true });
    });
  });
}

test("same form retries preserve idempotency ID and show unavailable storage safely", async ({ page }) => {
  await page.goto("/consultation/book");
  await page.locator('input[name="name"]').fill("Synthetic Person");
  await page.locator('input[name="email"]').fill("synthetic@example.test");
  await page.locator('input[name="preferredLocal"]').fill(new Date(Date.now() + 10 * 86400000).toISOString().slice(0, 16));
  await page.locator('input[name="termsAccepted"]').check(); await page.locator('input[name="privacyAccepted"]').check();
  const ids: string[] = [];
  await page.route("**/api/consultation/bookings", async (route) => {
    ids.push(route.request().postDataJSON().requestId);
    await route.fulfill({ status: 503, json: { error: "unavailable" } });
  });
  await page.getByRole("button", { name: "Send booking request", exact: true }).click();
  await expect(page.locator("form [role=alert]")).toContainText("Your appointment is not confirmed");
  await page.getByRole("button", { name: "Send booking request", exact: true }).click();
  await expect.poll(() => ids.length).toBe(2);
  expect(ids[0]).toBe(ids[1]);
});
