import { test, expect } from "@playwright/test";
for (const lang of ["en", "zh"] as const) {
  test(`${lang}: hosted customer journeys cannot activate synthetic successes`, async ({ page, context }, info) => {
    await context.addCookies([{ name: "lang", value: lang, url: "http://localhost:3270" }]);
    await page.goto("/");
    const tabs = page.getByTestId("bottom-navigation");
    expect(await tabs.locator("a").evaluateAll(rows => rows.map(a => a.getAttribute("href")))).toEqual(["/listings", "/account", "/applications", "/help"]);
    await expect(page.locator('a[href="/analytics"]')).toHaveCount(0);
    const writes: string[] = [], statusReads: string[] = [];
    page.on("request", r => { if (r.method() === "POST" && /\/api\/(chat|consultation|subscriptions)/.test(r.url())) writes.push(r.url()); });
    page.on("request", r => { if (new URL(r.url()).pathname === "/api/subscriptions/status") statusReads.push(r.url()); });
    await page.goto("/signup?mode=demo&next=%2Fpricing%3Fplan%3Dsmart");
    await expect(page.locator("main")).toContainText(lang === "zh" ? "登录服务尚未配置" : "Sign-in setup pending");
    await expect(page.locator("main button")).toHaveCount(0);
    for (const route of ["/", "/listings", "/quiz", "/pricing", "/chat", "/consultation", "/consultation/book", "/analytics", "/help"]) {
      await page.goto(route);
      await expect(page.getByTestId("demo-reset-warning")).toHaveCount(0);
      await expect(page.getByTestId("demo-notice")).toHaveCount(0);
      await expect(page.locator('[data-testid^="demo-save-"]')).toHaveCount(0);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      if (route === "/pricing") {
        for (const button of await page.locator("main button").all()) await expect(button).toBeDisabled();
        await expect(page.locator("main")).toContainText("$4.99");
        await expect(page.locator("main")).toContainText("$9.99");
        await expect(page.locator("main")).toContainText("$29.99");
        await expect(page.getByRole("checkbox")).toHaveCount(0);
      }
      if (route === "/chat") await expect(page.getByRole("textbox")).toBeDisabled();
      if (route === "/consultation") {
        await expect(page.locator('main a[href^="/consultation/book"]')).toHaveCount(0);
        await expect(page.locator("main")).toContainText("$59");
        await expect(page.locator("main")).toContainText("$99");
      }
      if (route === "/consultation/book") {
        await expect(page.locator('input[name="email"]')).toBeDisabled();
        await expect(page.locator('button[type="submit"]')).toBeDisabled();
        await expect(page.locator('input[name="email"]')).toHaveValue("");
      }
      if (["/pricing", "/chat", "/consultation"].includes(route)) await page.screenshot({ path: info.outputPath(`${lang}-${route.slice(1)}.png`), fullPage: true });
    }
    expect(writes).toEqual([]);
    expect(statusReads).toEqual([]);
    expect(await page.evaluate(() => localStorage.getItem("hm-preview-synthetic-v1"))).toBeNull();
  });
}

test("legacy synthetic identity and paid plan cannot authorize hosted journeys", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("hm-preview-synthetic-v1", JSON.stringify({ version: 1, expires: Date.now() + 86400000, signedIn: true, profile: "family", plan: "smart", saved: ["demo-exact"], day: "", used: 0, alerts: true, alertFrequency: "weekly", requests: [], applications: [] })));
  await page.goto("/account");
  await expect(page).toHaveURL(/signup/);
  await expect(page.locator("main")).toContainText("Sign-in setup pending");
  await page.goto("/pricing?plan=smart&checkout=success");
  await expect(page.getByTestId("selected-plan")).toHaveCount(0);
  await expect(page.locator("main")).not.toContainText("Current plan: Smart");
  await page.goto("/chat");
  await expect(page.getByRole("textbox")).toBeDisabled();
  await page.reload();
  await expect(page.getByRole("textbox")).toBeDisabled();
});
