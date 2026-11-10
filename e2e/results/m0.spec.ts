import { expect, test, type Page } from "@playwright/test";
import { DEFAULT_CONFIG, matchAll } from "../../src/lib/matching/engine";
import { ALL_FIXTURES, HH_3_85K, TODAY } from "../../src/lib/matching/fixtures/hn5";
import type { Listing } from "../../src/lib/types";

/**
 * Milestone 0 regressions (synthetic data only; /api/match response is replaced):
 *  - #7: EN/中文 switch fully visible and tappable at 320/375/390px.
 *  - Re-rentals are a separate, collapsed section and are never counted in the main matches.
 */
const lotteries = JSON.parse(JSON.stringify(matchAll(HH_3_85K, ALL_FIXTURES, { ...DEFAULT_CONFIG, today: TODAY })));
const rr: Listing = {
  ...ALL_FIXTURES[0],
  id: "rr-synthetic-1",
  projectName: "Synthetic Re-rental",
  listingType: "rerental",
  dataSource: "muse",
  sourceName: "Test Source",
  collectedAt: `${TODAY}T12:00:00Z`,
  applicationDeadline: null,
};
const rerentals = JSON.parse(JSON.stringify(matchAll(HH_3_85K, [rr], { ...DEFAULT_CONFIG, today: TODAY }))).map((r: object) => ({
  ...r,
  availability: "verified_open",
}));

async function submit(page: Page, lang: "en" | "zh") {
  await page.context().addCookies([{ name: "lang", value: lang, domain: "localhost", path: "/" }]);
  await page.route("**/api/match", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ results: lotteries, rerentals }) }),
  );
  await page.goto("/");
  await page.locator('button[aria-label="+"]').click();
  await page.fill('input[inputmode="numeric"]', "85000");
  await page.locator('form button:not([type="button"])').click();
  await expect(page.getByTestId("section-LIKELY_MATCH")).toBeVisible();
}

for (const width of [320, 375, 390]) {
  test(`#7 language switch fits and works by tap at ${width}px`, async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width, height: 800 }, hasTouch: true, isMobile: true });
    const page = await ctx.newPage();
    await page.goto("/");
    const zh = page.getByRole("button", { name: "中文" });
    const box = await zh.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x + box!.width).toBeLessThanOrEqual(width);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
    await zh.tap();
    await expect(page.getByRole("heading", { level: 1 })).toContainText("平价住房");
    await ctx.close();
  });
}

for (const lang of ["en", "zh"] as const) {
  test(`${lang}: re-rentals are separate, collapsed and not in the main counts`, async ({ page }) => {
    await submit(page, lang);
    const main = page.locator('[data-testid^="result-"]');
    await expect(main.filter({ hasText: "Synthetic Re-rental" })).toHaveCount(0);
    const section = page.getByTestId("rerentals");
    await expect(section).toBeVisible();
    await expect(section).toContainText(lang === "en" ? "Couldn't find your match? Try Re-rentals." : "没有找到合适的？看看 Re-rental 空房。");
    await expect(section).toContainText(lang === "en" ? "HousingMatch does not submit applications." : "HousingMatch 不会替你提交申请。");
    await expect(section.getByText("Synthetic Re-rental")).toHaveCount(0); // collapsed
    await section.getByRole("button").click();
    await expect(section.getByText("Synthetic Re-rental")).toBeVisible();
    await expect(section.locator('[data-availability="verified_open"]')).toBeVisible();
    // T005 #8: the box must not repeat the page heading or reuse the main sections' ids.
    const dupIds = await page.evaluate(() => {
      const ids = [...document.querySelectorAll("[id]")].map((e) => e.id);
      return ids.filter((id, i) => ids.indexOf(id) !== i);
    });
    expect(dupIds).toEqual([]);
    await expect(page.getByRole("heading", { level: 2, name: lang === "en" ? "Your preliminary results" : "初步匹配结果" })).toHaveCount(1);
    for (const el of await section.locator("[aria-labelledby]").all()) {
      const id = await el.getAttribute("aria-labelledby");
      expect(await section.locator(`#${id}`).count()).toBe(1);
    }
  });
}
