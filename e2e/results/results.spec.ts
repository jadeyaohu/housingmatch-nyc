import { expect, test, type Page } from "@playwright/test";
import { DEFAULT_CONFIG, matchAll } from "../../src/lib/matching/engine";
import { ALL_FIXTURES, HH_3_85K, TODAY } from "../../src/lib/matching/fixtures/hn5";

/**
 * Issue #5 Phase A in real Chromium. The app is real; only the /api/match RESPONSE is replaced
 * (page.route) with engine output for synthetic fixtures, so results never depend on live data.
 */
const results = JSON.parse(JSON.stringify(matchAll(HH_3_85K, ALL_FIXTURES, { ...DEFAULT_CONFIG, today: TODAY })));

async function run(page: Page, lang: "en" | "zh") {
  await page.context().addCookies([{ name: "lang", value: lang, domain: "localhost", path: "/" }]);
  const bodies: unknown[] = [];
  await page.route("**/api/match", async (route) => {
    bodies.push(JSON.parse(route.request().postData() ?? "null"));
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ results }) });
  });
  await page.goto("/");
  await page.locator('button[aria-label="+"]').click();
  await page.fill('input[inputmode="numeric"]', "85000");
  await page.locator('form button:not([type="button"])').click();
  await expect(page.getByTestId("section-LIKELY_MATCH")).toBeVisible();
  return bodies;
}

const COPY = {
  en: {
    counts: "1 preliminary · 3 possible (data incomplete) · 2 not shown",
    likely: "Preliminary match — based on income limits in our data (1)",
    review: "Possible match — data incomplete, please confirm (3)",
    warn: "Household-size limits aren't in our data.",
    closing: "Closes in 3 days",
    link: "View official listing & income chart ↗",
  },
  zh: {
    counts: "初步符合 1 个 · 可能符合 3 个（资料不完整）· 未显示 2 个",
    likely: "初步符合（基于现有收入数据） (1)",
    review: "可能符合（资料不完整，请核实） (3)",
    warn: "我们的数据中没有家庭人数限制。",
    closing: "3 天后截止",
    link: "查看官方页面和收入表 ↗",
  },
} as const;

for (const lang of ["en", "zh"] as const) {
  test(`${lang}: sections, counts, warnings, closing-soon, official links; request unchanged`, async ({ page }, info) => {
    const bodies = await run(page, lang);
    const c = COPY[lang];
    expect(bodies).toEqual([{ size: 3, annualIncome: 85000, boroughs: [], bedrooms: [], hasVoucher: false, hasMember62Plus: false, hasMember55Plus: false, hasDisability: false }]);
    await expect(page.getByTestId("result-counts")).toHaveText(c.counts);
    const likely = page.getByTestId("section-LIKELY_MATCH");
    const review = page.getByTestId("section-NEEDS_REVIEW");
    await expect(likely.locator("h3")).toHaveText(c.likely);
    await expect(review.locator("h3")).toHaveText(c.review);
    expect((await likely.boundingBox())!.y).toBeLessThan((await review.boundingBox())!.y);
    await expect(page.getByTestId("section-UNLIKELY_MATCH")).toHaveCount(0);

    // Order inside sections: LIKELY F3; then F1 (3 days), F6, F2.
    await expect(likely.locator("li[data-testid^=result-]")).toHaveCount(1);
    expect(await review.locator("li[data-testid^=result-]").evaluateAll((els) => els.map((e) => e.getAttribute("data-testid")))).toEqual([
      "result-hc-90001",
      "result-hc-90006",
      "result-hc-90002",
    ]);

    const f1 = page.getByTestId("result-hc-90001");
    await expect(f1.getByTestId("quality-warnings")).toContainText(c.warn);
    await expect(f1.getByTestId("closing-soon")).toHaveText(c.closing);
    const link = f1.getByRole("link");
    await expect(link).toHaveText(c.link);
    await expect(link).toHaveAttribute("href", "https://housingconnect.nyc.gov/PublicWeb/details/90001");
    await expect(link).toHaveAttribute("target", "_blank");

    const f2 = page.getByTestId("result-hc-90002");
    expect(await f2.textContent()).not.toMatch(/\$\s?\d|84,103|96,652/);
    await expect(f2.getByTestId("closing-soon")).toHaveCount(0);

    // "Why" details: unknown rules show "?" — never "✓"
    await f1.locator("summary").click();
    const unknowns = f1.locator('[data-outcome="unknown"]');
    await expect(unknowns).toHaveCount(2);
    for (const t of await unknowns.allTextContents()) expect(t.startsWith("?")).toBe(true);

    // Layout: no horizontal overflow on any viewport
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

    await page.getByTestId("section-LIKELY_MATCH").scrollIntoViewIfNeeded();
    await page.screenshot({ path: info.outputPath(`results-${lang}.png`), fullPage: true });
  });
}

test("show unlikely reveals a third section; other counts don't change", async ({ page }) => {
  await run(page, "en");
  await page.getByRole("checkbox", { name: /Show unlikely matches/ }).check();
  await expect(page.getByTestId("section-UNLIKELY_MATCH")).toBeVisible();
  await expect(page.getByTestId("result-counts")).toHaveText(COPY.en.counts);
});

test("language toggle re-renders results copy without breaking the page", async ({ page }) => {
  await run(page, "en");
  const toggle = page.getByRole("group", { name: "Language" }).getByRole("button", { name: "中文" });
  await page.evaluate(() => window.scrollTo(0, 0));
  await toggle.scrollIntoViewIfNeeded();
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByTestId("result-counts")).toHaveText(COPY.zh.counts);
});
