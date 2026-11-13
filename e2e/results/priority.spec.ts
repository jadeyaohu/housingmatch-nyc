import { expect, test } from "@playwright/test";
import { DEFAULT_CONFIG, matchAll } from "../../src/lib/matching/engine";
import { ALL_FIXTURES, HH_3_85K, TODAY } from "../../src/lib/matching/fixtures/hn5";
import { priorityFit } from "../../src/lib/priority";
import zipMap from "../../src/lib/data/zip-districts.json";

/** Priority groups (lottery preferences): synthetic listings, response replaced. */
const [zip, [cd]] = Object.entries(zipMap as Record<string, string[]>).find(([, v]) => v.length === 1)!;
const listing = { ...ALL_FIXTURES[0], id: "pref-synthetic", projectName: "Synthetic Preference Lottery", preferences: { communityDistrict: cd, communityPct: 50, nychaPct: 25, municipalVetPct: 5 } };
const rows = JSON.parse(JSON.stringify(matchAll(HH_3_85K, [listing], { ...DEFAULT_CONFIG, today: TODAY }))).map((r: object) => ({
  ...r,
  availability: "verified_open",
  priority: priorityFit(listing, { zip, nycha: true, municipalVet: null }),
}));

for (const lang of ["en", "zh"] as const) {
  test(`${lang}: priority groups explain community / NYCHA preferences without odds`, async ({ page }) => {
    await page.context().addCookies([{ name: "lang", value: lang, domain: "localhost", path: "/" }]);
    await page.route("**/api/match", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ results: rows, rerentals: [] }) }));
    await page.goto("/match");
    await page.locator('button[aria-label="+"]').click();
    await page.fill('input[inputmode="numeric"]', "85000");
    await page.locator('form button:not([type="button"])').click();
    const box = page.getByTestId("result-pref-synthetic").getByTestId("priority");
    await expect(box).toBeVisible();
    await expect(box.locator('[data-priority="community"]')).toHaveAttribute("data-fit", "yes");
    await expect(box.locator('[data-priority="nycha"]')).toHaveAttribute("data-fit", "yes");
    await expect(box.locator('[data-priority="municipal_vet"]')).toHaveAttribute("data-fit", "unknown");
    await expect(box).toContainText(lang === "en" ? "50% of units go first to residents of" : "50% 的单位优先给");
    await expect(box).toContainText(lang === "en" ? "don't change who is eligible" : "不改变谁符合资格");
    await expect(box).not.toContainText(/odds|chance|几率|概率/);
  });
}

test("API: synthetic data returns priority groups for a ZIP, and rejects a malformed ZIP", async ({ request }) => {
  const ok = await request.post("/api/match", { data: { size: 1, annualIncome: 60000, zip, nycha: true } });
  expect(ok.ok()).toBeTruthy();
  const body = await ok.json();
  const all = [...body.results, ...body.rerentals];
  expect(all.every((r: { priority?: unknown[] }) => Array.isArray(r.priority))).toBe(true);
  const bad = await request.post("/api/match", { data: { size: 1, annualIncome: 60000, zip: "12ab" } });
  expect(bad.status()).toBe(400);
});
