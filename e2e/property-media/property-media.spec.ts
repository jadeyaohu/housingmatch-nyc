import { test, expect } from "@playwright/test";

for (const lang of ["en", "zh"] as const) {
  test(`${lang}: unpublished property images use the shared architectural illustration`, async ({ page, context }) => {
    await context.addCookies([{ name: "lang", value: lang, url: "http://localhost:3270" }]);
    const label = lang === "zh" ? "建筑示意图 — 非实际房源照片" : "Illustrative image — not an actual property photo";
    for (const route of ["/listings", "/listings/hc-7599", "/listings/hc-7625", "/listings/hc-7338"]) {
      await page.goto(route);
      const captions = page.locator("main figure figcaption");
      await expect(captions.first()).toBeVisible();
      for (const caption of await captions.all()) {
        await expect(caption).toHaveText(label);
        const bounds = await caption.boundingBox();
        expect(bounds).not.toBeNull();
        expect(bounds!.x).toBeGreaterThanOrEqual(0);
        expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(page.viewportSize()!.width);
      }
      await expect(page.locator('main [data-photo-status="verified_property"]')).toHaveCount(0);
      await expect(page.locator('main img[src*="/images/properties/"]')).toHaveCount(0);
    }
  });
}
