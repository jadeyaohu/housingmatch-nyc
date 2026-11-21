import { test, expect } from "@playwright/test";
for (const lang of ["en", "zh"] as const) {
  test(`${lang}: founder-approved mobile tab order and destinations`, async ({ page, context }) => {
    await context.addCookies([{ name: "lang", value: lang, url: "http://localhost:3260" }]);
    await page.goto("/listings");
    const nav = page.getByTestId("bottom-navigation"), links = nav.locator("a");
    const labels = lang === "zh" ? ["房源", "匹配", "AI助手", "我的"] : ["Explore", "Match", "Ask AI", "My"];
    const routes = ["/listings", "/quiz", "/chat", "/account"];
    expect(await links.allTextContents()).toEqual(labels);
    expect(await links.evaluateAll(rows => rows.map(a => a.getAttribute("href")))).toEqual(routes);
    if (page.viewportSize()!.width < 768) {
      await expect(nav).toBeVisible();
      for (let i = 0; i < routes.length; i++) {
        await links.nth(i).click();
        await expect(page).toHaveURL(new RegExp(`${routes[i]}$`));
        await expect(nav.locator('[aria-current="page"]')).toHaveCount(1);
        await expect(links.nth(i)).toHaveAttribute("aria-current", "page");
        const link = await links.nth(i).boundingBox(), label = await links.nth(i).locator("span").boundingBox();
        expect(label!.x).toBeGreaterThanOrEqual(link!.x);
        expect(label!.x + label!.width).toBeLessThanOrEqual(link!.x + link!.width);
      }
    } else await expect(nav).toBeHidden();
    await page.getByRole("button", { name: lang === "zh" ? "打开菜单" : "Open menu" }).click();
    const menu = page.getByRole("dialog");
    await expect(menu.locator('a[href="/applications"]')).toBeVisible();
    await expect(menu.locator('a[href="/help"]')).toBeVisible();
  });
}
