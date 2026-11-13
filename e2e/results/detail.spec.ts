import { expect, test } from "@playwright/test";

/** Listing detail page with synthetic development fixtures. */
for (const lang of ["en", "zh"] as const) {
  test(`${lang}: listing detail shows income groups, priority groups and the official link`, async ({ page }) => {
    await page.context().addCookies([{ name: "lang", value: lang, domain: "localhost", path: "/" }]);
    await page.goto("/listings/demo-exact");
    const d = page.getByTestId("listing-detail");
    await expect(d.getByRole("heading", { level: 1 })).toHaveText("DEMO Cedar Court");
    await expect(page.getByTestId("detail-priority")).toContainText(lang === "en" ? "Bronx Community Districts 2, 5 and 7" : "布朗克斯第 2、5、7 社区区");
    await expect(page.getByTestId("income-bands")).toBeVisible();
    // 7625 now carries Housing Connect's own table (Muse Run A): exact limits and rents, no estimate notes.
    await expect(page.getByTestId("range-note")).toHaveCount(0);
    await expect(page.getByTestId("income-bands")).toContainText("$732");
    await expect(page.getByTestId("income-bands")).toContainText("$29,418");
    // Published columns for larger households must not be truncated after four entries.
    await expect(page.getByTestId("income-bands")).toContainText(lang === "en" ? "7 people: $105,200" : "7 人：$105,200");
    await expect(page.getByTestId("income-bands")).toContainText(lang === "en" ? "3–7 people" : "3–7 人");
    await expect(page.getByTestId("detail-setaside")).toContainText(lang === "en" ? "5% mobility, 2% vision/hearing" : "5% 行动障碍、2% 视力/听力障碍");
    await expect(page.getByTestId("detail-official")).toHaveAttribute("href", /housingconnect\.nyc\.gov\/PublicWeb\//);
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

test("a lottery with only Open Data categories explains that the group is an AMI range", async ({ page }) => {
  await page.goto("/listings/demo-range");
  await expect(page.getByTestId("range-note").first()).toContainText("covers 81–120% AMI");
  await expect(page.getByTestId("income-bands")).toContainText("Sizes (whole building)");
  await expect(page.getByTestId("income-incomplete").first()).toBeVisible();
  await expect(page.getByTestId("income-bands")).toContainText("General HPD reference maximum");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
