import { expect, test, type Page } from "@playwright/test";
import { DEFAULT_CONFIG, matchAll } from "../../src/lib/matching/engine";
import { ALL_FIXTURES, HH_3_85K, TODAY } from "../../src/lib/matching/fixtures/hn5";

/**
 * Issue #5 Phase A in real Chromium. The app is real; only the /api/match RESPONSE is replaced
 * (page.route) with engine output for synthetic fixtures, so results never depend on live data.
 */
const results = JSON.parse(JSON.stringify(matchAll(HH_3_85K, ALL_FIXTURES, { ...DEFAULT_CONFIG, today: TODAY })));

async function run(page: Page, lang: "en" | "zh", payload: unknown = results) {
  await page.context().addCookies([{ name: "lang", value: lang, domain: "localhost", path: "/" }]);
  const bodies: unknown[] = [];
  await page.route("**/api/match", async (route) => {
    bodies.push(JSON.parse(route.request().postData() ?? "null"));
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ results: payload }) });
  });
  await page.goto("/match");
  await page.locator('button[aria-label="+"]').click();
  await page.fill('input[inputmode="numeric"]', "85000");
  await page.locator('form button:not([type="button"])').click();
  await expect(page.getByTestId("section-LIKELY_MATCH")).toBeVisible();
  return bodies;
}

const COPY = {
  en: {
    counts: "1 look like a fit · 4 might fit (details missing) · 2 not shown",
    likely: "Looks like a fit — based on the income limits we have (1)",
    review: "Might fit — we're missing some details, please check (4)",
    confirm: "Confirm on Housing Connect before applying.",
    restriction: "This lottery may have veteran-related preferences or eligibility rules; check the official listing.",
    warn: "Household-size limits aren't in our data.",
    closing: "Closes in 3 days",
    link: "View official listing & income chart ↗",
  },
  zh: {
    counts: "看起来符合 1 个 · 可能符合 4 个（缺少部分资料）· 未显示 2 个",
    likely: "看起来符合（根据我们现有的收入要求） (1)",
    review: "可能符合（我们缺少部分资料，请再核对） (4)",
    confirm: "申请前请在 Housing Connect 上核实。",
    restriction: "该项目涉及退伍军人相关优先权或资格规定，请查看官方要求。",
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

    // Order inside sections: LIKELY F3; then F7 (published limits), F1 (3 days), F6, F2.
    await expect(likely.locator("li[data-testid^=result-]")).toHaveCount(1);
    expect(await review.locator("li[data-testid^=result-]").evaluateAll((els) => els.map((e) => e.getAttribute("data-testid")))).toEqual([
      "result-hc-90007",
      "result-hc-90001",
      "result-hc-90006",
      "result-hc-90002",
    ]);

    const f1 = page.getByTestId("result-hc-90001");
    await expect(f1.getByTestId("quality-warnings")).toContainText(c.warn);
    await expect(f1.getByTestId("closing-soon")).toHaveText(c.closing);
    const link = f1.getByRole("link", { name: /official|官方/i });
    await expect(link).toContainText(c.link); // plus an sr-only "opens in a new tab" hint
    await expect(link).toHaveAttribute("href", "https://housingconnect.nyc.gov/PublicWeb/details/90001");
    await expect(link).toHaveAttribute("target", "_blank");

    const f2 = page.getByTestId("result-hc-90002");
    expect(await f2.textContent()).not.toMatch(/\$\s?\d|84,103|96,652/);
    await expect(f2.getByTestId("closing-soon")).toHaveCount(0);

    // Every NEEDS_REVIEW card shows the confirmation — incl. F7, which has NO quality warnings.
    for (const id of ["hc-90007", "hc-90001", "hc-90006", "hc-90002"]) {
      await expect(page.getByTestId(`result-${id}`).getByTestId("review-confirm")).toHaveText(c.confirm);
    }
    const f7 = page.getByTestId("result-hc-90007");
    await expect(f7.getByTestId("unknown-reasons")).toContainText(c.restriction);
    await expect(f7.locator("[data-warning]")).toHaveCount(0);
    await expect(f7.getByTestId("review-confirm")).toBeVisible();

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
  const group = page.getByRole("group", { name: "Language" });
  const toggle = group.getByRole("button", { name: "中文" });
  await page.evaluate(() => window.scrollTo(0, 0));
  // Diagnostic for a PRE-EXISTING header issue (not changed by this PR): in CI at 375 px the EN
  // button's box has been observed to overlap 中文's hit point. Log both boxes for follow-up.
  const en = await group.getByRole("button", { name: "EN" }).boundingBox();
  const zh = await toggle.boundingBox();
  console.log(`[lang-toggle-boxes] ${test.info().project.name} EN=${JSON.stringify(en)} ZH=${JSON.stringify(zh)} overlap=${!!en && !!zh && en.x + en.width > zh.x}`);
  // Activate via keyboard so this test checks results behaviour, not header hit-testing.
  await toggle.focus();
  await page.keyboard.press("Enter");
  await expect(toggle).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByTestId("result-counts")).toHaveText(COPY.zh.counts);
});

for (const lang of ["en", "zh"] as const) {
  test(`${lang}: older response without quality metadata still asks for confirmation on every possible match`, async ({ page }) => {
    const stripped = (results as Array<{ result: Record<string, unknown> }>).map((r) => ({ ...r, result: { ...r.result, quality: undefined } }));
    await run(page, lang, JSON.parse(JSON.stringify(stripped)));
    const review = page.getByTestId("section-NEEDS_REVIEW");
    const cards = review.locator("li[data-testid^=result-]");
    await expect(cards).toHaveCount(4);
    for (let i = 0; i < 4; i++) await expect(cards.nth(i).getByTestId("review-confirm")).toHaveText(COPY[lang].confirm);
    await expect(page.getByTestId("result-hc-90007").getByTestId("unknown-reasons")).toContainText(COPY[lang].restriction);
    await expect(page.getByTestId("closing-soon")).toHaveCount(0); // no quality → no chip, no invented data
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });
}
