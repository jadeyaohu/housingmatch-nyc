import { expect, test } from "@playwright/test";

/**
 * @flag-off — run against a DEFAULT build (NEXT_PUBLIC_ANALYTICS_ENABLED unset).
 * Tracking must be completely inert: no /api/events requests, no storage writes, no
 * BroadcastChannel, no tracking cookies — while matching behaves exactly as before.
 */
test("@flag-off: full flow sends no analytics requests and mutates no storage", async ({ context, page, baseURL }) => {
  // Keep the test hermetic: external application sites opened by the apply link are stubbed.
  await context.route(/^https?:\/\/(?!localhost)/, (r) => r.fulfill({ status: 204, body: "" }));
  await page.addInitScript(() => {
    const w = window as unknown as { __bc: number; __writes: string[] };
    w.__bc = 0;
    w.__writes = [];
    const RealBC = window.BroadcastChannel;
    window.BroadcastChannel = class extends RealBC {
      constructor(n: string) {
        super(n);
        w.__bc++;
      }
    } as typeof BroadcastChannel;
    const set = Storage.prototype.setItem;
    Storage.prototype.setItem = function (k: string, v: string) {
      w.__writes.push(k);
      return set.call(this, k, v);
    };
  });
  const analytics: string[] = [];
  const match: string[] = [];
  page.on("request", (r) => {
    const p = new URL(r.url()).pathname;
    if (p === "/api/events") analytics.push(r.method());
    if (p === "/api/match") match.push(r.method());
  });
  await page.goto("/?utm_source=xiaohongshu&income=85000");
  await page.locator('button[aria-label="+"]').click();
  await page.fill('input[inputmode="numeric"]', "85000");
  await page.locator('form button:not([type="button"])').click();
  await expect(page.locator("section ul > li").first()).toBeVisible();
  await page.locator("section ul > li details summary").first().click();
  const link = page.locator("section ul > li a[target=_blank]").first();
  await link.scrollIntoViewIfNeeded();
  await link.click();
  await page.goto("/listings?borough=Bronx");
  await page.waitForTimeout(1000);

  expect(analytics).toEqual([]);
  expect(match).toEqual(["POST"]);
  const state = await page.evaluate(() => {
    const w = window as unknown as { __bc: number; __writes: string[] };
    return { bc: w.__bc, writes: w.__writes, ss: sessionStorage.length, ls: localStorage.length };
  });
  expect(state).toEqual({ bc: 0, writes: [], ss: 0, ls: 0 });
  expect((await context.cookies(baseURL!)).map((c) => c.name)).toEqual([]); // no cookies on our origin
});
