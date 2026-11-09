import { expect, test } from "@playwright/test";

/** Listing detail page with real data (read-only). */
for (const lang of ["en", "zh"] as const) {
  test(`${lang}: listing detail shows income groups, priority groups and the official link`, async ({ page }) => {
    await page.context().addCookies([{ name: "lang", value: lang, domain: "localhost", path: "/" }]);
    await page.goto("/listings/hc-7625");
    const d = page.getByTestId("listing-detail");
    await expect(d.getByRole("heading", { level: 1 })).toHaveText("MORRIS HEIGHTS/UNIVERSITY HEIGHTS");
    await expect(page.getByTestId("detail-priority")).toContainText(lang === "en" ? "Bronx Community Districts 2, 5 and 7" : "布朗克斯第 2、5、7 社区区");
    await expect(page.getByTestId("income-bands")).toBeVisible();
    // T011: Open Data groups are AMI ranges; say so instead of implying the top limit applies to every unit.
    await expect(page.getByTestId("range-note").first()).toContainText(lang === "en" ? "covers 31–50% AMI" : "覆盖 31–50% AMI");
    await expect(page.getByTestId("income-bands")).toContainText(lang === "en" ? "Sizes (whole building)" : "户型（整栋楼）");
    await expect(page.getByTestId("detail-setaside")).toContainText(lang === "en" ? "5% mobility, 2% vision/hearing" : "5% 行动障碍、2% 视力/听力障碍");
    await expect(page.getByTestId("detail-official")).toHaveAttribute("href", /housingconnect\.nyc\.gov\/PublicWeb\/details\/7625/);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });
}

test("browse card title opens the detail page; unknown id is a 404", async ({ page }) => {
  await page.goto("/listings");
  const first = page.locator("ul li h2 a").first();
  const name = (await first.textContent())!.trim();
  await first.click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(name);
  const r = await page.goto("/listings/does-not-exist");
  expect(r?.status()).toBe(404);
});
