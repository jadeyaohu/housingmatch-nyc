import { expect, test } from "@playwright/test";
import { DEFAULT_CONFIG, matchAll } from "../../src/lib/matching/engine";
import { ALL_FIXTURES, HH_3_85K, TODAY } from "../../src/lib/matching/fixtures/hn5";

/** M2 quiz flow in real Chromium with synthetic match results (the /api/match response is replaced). */
const results = JSON.parse(JSON.stringify(matchAll(HH_3_85K, ALL_FIXTURES, { ...DEFAULT_CONFIG, today: TODAY }))).map((r: object) => ({ ...r, availability: "verified_open" }));

for (const lang of ["en", "zh"] as const) {
  test(`${lang}: landing → quiz → match-count preview → sign-up gate`, async ({ page }) => {
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
    await page.getByTestId("quiz-nycha").click();
    await page.getByTestId("quiz-zip").fill("10451abc");
    await expect(page.getByTestId("quiz-zip")).toHaveValue("10451");
    await page.getByTestId("quiz-next").click();

    await expect(page.getByTestId("quiz-results")).toBeVisible();
    expect(body).toMatchObject({ size: 3, annualIncome: 85000, boroughs: ["Bronx"], rentMax: 2500, hasVoucher: false, zip: "10451", nycha: true, municipalVet: null });
    for (const k of ["likely", "review", "open"]) await expect(page.getByTestId(`count-${k}`)).toBeVisible();
    // Preview/local builds have sign-up (dev Supabase project): the preview gates full results behind a free account.
    const cta = page.getByTestId("signup-cta");
    await expect(cta).toBeVisible();
    await expect(cta).toHaveAttribute("href", "/signup?next=%2Fquiz");
    await cta.click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(lang === "en" ? "Create your free account" : "免费注册账号");
    await expect(page.locator('input[type="email"]')).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });
}

test("T006: reload keeps the question you were on; Start over clears everything", async ({ page }) => {
  await page.context().addCookies([{ name: "lang", value: "en", domain: "localhost", path: "/" }]);
  await page.goto("/quiz");
  await page.getByRole("button", { name: "Bronx" }).click();
  await page.getByTestId("quiz-next").click();
  await page.getByTestId("quiz-next").click();
  await expect(page.getByTestId("quiz-step")).toContainText("Question 3 of 7");
  await page.reload();
  await expect(page.getByTestId("quiz-step")).toContainText("Question 3 of 7");
  await page.getByTestId("quiz-start-over").click();
  await expect(page.getByTestId("quiz-step")).toContainText("Question 1 of 7");
  await expect(page.getByRole("button", { name: "Anywhere is fine" })).toHaveAttribute("aria-pressed", "true");
  await page.reload();
  await expect(page.getByTestId("quiz-step")).toContainText("Question 1 of 7");
  await expect(page.getByTestId("quiz-start-over")).toHaveCount(0);
});

test("T006: 'open now' only counts lotteries you might fit, not unlikely ones", async ({ page }) => {
  const unlikelyOpen = results.map((r: { result: { status: string } }) => ({ ...r, result: { ...r.result, status: "UNLIKELY_MATCH" } }));
  await page.route("**/api/match", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ results: unlikelyOpen, rerentals: [] }) }));
  await page.goto("/quiz");
  for (let i = 0; i < 4; i++) await page.getByTestId("quiz-next").click();
  await page.fill('input[inputmode="numeric"]', "85000");
  await page.getByTestId("quiz-next").click();
  await page.getByRole("button", { name: "No", exact: true }).click();
  await page.getByTestId("quiz-next").click();
  await page.getByTestId("quiz-next").click();
  await expect(page.getByTestId("count-open")).toContainText("0");
});


test("annual income rejects text and overlarge amounts before matching (EN + 中文)", async ({ page }) => {
  await page.addInitScript(()=>localStorage.removeItem("hm-quiz-v1"));
  for (const lang of ["en", "zh"] as const) {
    await page.context().clearCookies();
    await page.context().addCookies([{ name: "lang", value: lang, domain: "localhost", path: "/" }]);
    await page.goto("/quiz");
    for (let i = 0; i < 4; i++) await page.getByTestId("quiz-next").click();
    const income = page.locator('input[inputmode="numeric"]').first();
    await income.fill("not income");
    await expect(income).toHaveValue("");
    await expect(page.getByTestId("quiz-next")).toBeDisabled();
    await income.fill("99999999");
    await expect(page.getByTestId("quiz").getByRole("alert")).toContainText(lang === "en" ? "valid yearly income" : "家庭年收入");
    await expect(page.getByTestId("quiz-next")).toBeDisabled();
    await income.fill("5000001");
    await expect(page.getByTestId("quiz-next")).toBeDisabled();
    await income.fill("85,000");
    await expect(income).toHaveValue("85000");
    await expect(page.getByTestId("quiz-next")).toBeEnabled();
  }
});
