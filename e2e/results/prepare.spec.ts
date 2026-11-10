import { expect, test } from "@playwright/test";

for (const lang of ["en", "zh"] as const) {
  test(`${lang}: document checklist ticks persist on this device and link to the official list`, async ({ page }) => {
    await page.context().addCookies([{ name: "lang", value: lang, domain: "localhost", path: "/" }]);
    await page.goto("/prepare");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(lang === "en" ? "Get your documents ready" : "提前准备申请材料");
    const first = page.getByTestId("docs-people").getByRole("checkbox").first();
    await first.check();
    await expect(page.getByTestId("doc-progress")).toContainText(lang === "en" ? "1 of 23 ready" : "已准备 1 / 23 项");
    await page.reload();
    await expect(page.getByTestId("docs-people").getByRole("checkbox").first()).toBeChecked();
    await expect(page.getByRole("link", { name: /Attachment H-1C/ })).toHaveAttribute("href", /housingconnect\.nyc\.gov/);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });
}

test("after-you-apply page: 6 steps from HPD guide, links to /prepare, no odds claims", async ({ page }) => {
  await page.goto("/after-you-apply");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("What happens after you apply");
  await expect(page.locator("ol > li")).toHaveCount(6);
  await expect(page.getByTestId("after-you-apply")).toContainText("2 to 12 months");
  await expect(page.getByTestId("after-you-apply")).not.toContainText(/odds|chance of winning|%/);
  await page.getByTestId("to-prepare").click();
  await expect(page.getByTestId("prepare")).toBeVisible();
  await expect(page.getByTestId("to-after")).toHaveAttribute("href", "/after-you-apply");
});
