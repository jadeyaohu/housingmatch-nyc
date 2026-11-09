import { expect, test } from "@playwright/test";
import { DEFAULT_CONFIG, matchAll } from "../../src/lib/matching/engine";
import { ALL_FIXTURES, HH_3_85K, TODAY } from "../../src/lib/matching/fixtures/hn5";

/** M2 quiz flow in real Chromium with synthetic match results (the /api/match response is replaced). */
const results = JSON.parse(JSON.stringify(matchAll(HH_3_85K, ALL_FIXTURES, { ...DEFAULT_CONFIG, today: TODAY }))).map((r: object) => ({ ...r, availability: "verified_open" }));

for (const lang of ["en", "zh"] as const) {
  test(`${lang}: landing → quiz → match-count preview → full results`, async ({ page }) => {
    await page.context().addCookies([{ name: "lang", value: lang, domain: "localhost", path: "/" }]);
    let body: Record<string, unknown> | null = null;
    await page.route("**/api/match", async (route) => {
      body = JSON.parse(route.request().postData() ?? "null");
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ results, rerentals: [] }) });
    });
    await page.goto("/");
    await page.getByTestId("hero-cta").click();
    await expect(page.getByTestId("quiz-step")).toContainText(lang === "en" ? "Question 1 of 7" : "第 1 题");

    // 1 borough, 2 size: skip; 3 budget: pick $2,500
    await page.getByRole("button", { name: lang === "en" ? "Bronx" : "布朗克斯" }).click();
    await page.getByTestId("quiz-next").click();
    await page.getByRole("button", { name: lang === "en" ? "Skip" : "跳过" }).click();
    await page.getByRole("button", { name: "$2,500" }).click();
    await page.getByTestId("quiz-next").click();
    // 4 household size: 3 (back once to prove navigation works)
    await page.getByRole("button", { name: "+" }).click();
    await page.getByRole("button", { name: lang === "en" ? "← Back" : "← 上一步" }).click();
    await expect(page.getByRole("button", { name: "$2,500" })).toHaveAttribute("aria-pressed", "true");
    await page.getByTestId("quiz-next").click();
    await expect(page.getByTestId("quiz-size")).toHaveText("2"); // answer kept after going back
    await page.getByRole("button", { name: "+" }).click();
    await expect(page.getByTestId("quiz-size")).toHaveText("3");
    await page.getByTestId("quiz-next").click();
    // 5 income: Next disabled until filled
    await expect(page.getByTestId("quiz-next")).toBeDisabled();
    await page.fill('input[inputmode="numeric"]', "85000");
    await page.getByTestId("quiz-next").click();
    // 6 voucher (required), 7 optional
    await expect(page.getByTestId("quiz-next")).toBeDisabled();
    await page.getByRole("button", { name: lang === "en" ? "No" : "没有", exact: true }).click();
    await page.getByTestId("quiz-next").click();
    await page.getByTestId("quiz-next").click();

    await expect(page.getByTestId("quiz-results")).toBeVisible();
    expect(body).toMatchObject({ size: 3, annualIncome: 85000, boroughs: ["Bronx"], rentMax: 2500, hasVoucher: false });
    for (const k of ["likely", "review", "open"]) await expect(page.getByTestId(`count-${k}`)).toBeVisible();
    await expect(page.getByTestId("auth-soon")).toBeVisible();

    await page.getByRole("button", { name: lang === "en" ? "View my full results" : "查看完整结果" }).click();
    await expect(page.getByTestId("section-LIKELY_MATCH").or(page.getByTestId("section-NEEDS_REVIEW")).first()).toBeVisible();
    await expect(page.getByTestId("rerentals")).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });
}
