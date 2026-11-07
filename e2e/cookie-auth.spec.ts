import { expect, test } from "@playwright/test";

/**
 * Cookie-protected deployment compatibility (PR #4 P2), in real Chromium.
 * e2e/auth-proxy.mjs requires a session cookie on EVERY request (like Vercel Authentication),
 * then forwards to the app. The app's /api/events answers 204 (server ingestion off).
 * This is a local stand-in — not proof of Vercel's real protection; that needs a protected
 * Preview smoke test with an authorized signed-in session.
 */
const AUTH_PORT = Number(process.env.E2E_AUTH_PORT ?? 3211);
const BASE = `http://localhost:${AUTH_PORT}`;

test("authenticated analytics requests pass protection; unauthenticated are rejected; neither sends Referer or query text", async ({ context, page }) => {
  await context.addCookies([{ name: "_vercel_jwt", value: "e2e-test-token", url: BASE, httpOnly: true, sameSite: "Lax" }]);

  type Seen = { status: number; cookie: string | undefined; referer: string | undefined; body: string; url: string; names: string[] };
  const seen: Promise<Seen>[] = [];
  page.on("response", (res) => {
    const req = res.request();
    if (req.method() === "POST" && new URL(req.url()).pathname === "/api/events") {
      seen.push(
        req.allHeaders().then((h) => {
          const body = req.postData() ?? "";
          return { status: res.status(), cookie: h["cookie"], referer: h["referer"], body, url: req.url(), names: (JSON.parse(body).events ?? []).map((e: { event_name: string }) => e.event_name) };
        }),
      );
    }
  });

  // 1) Signed-in session on a page whose URL carries sensitive query text.
  const nav = await page.goto(`${BASE}/?income=85000&name=Jane%20Doe&email=jane%40example.com`);
  expect(nav?.status()).toBe(200);
  await expect.poll(async () => (await Promise.all(seen)).length, { timeout: 10_000 }).toBeGreaterThanOrEqual(1);
  const [authed] = await Promise.all(seen);
  expect(authed.names).toEqual(["page_view"]);
  expect(authed.status).toBe(204); // passed protection; app accepted (and, flag off, dropped)
  expect(authed.cookie).toContain("_vercel_jwt=e2e-test-token");
  expect(authed.referer).toBeUndefined();
  expect(authed.url).toBe(`${BASE}/api/events`);
  expect(authed.body).not.toMatch(/85000|Jane|jane%40|example\.com|income|email|\?/i);

  // 2) Session cookie gone (signed out / expired): the next analytics request is rejected.
  await context.clearCookies();
  await page.locator('button[aria-label="+"]').click();
  await expect.poll(async () => (await Promise.all(seen)).length, { timeout: 10_000 }).toBe(2);
  const unauthed = (await Promise.all(seen))[1];
  expect(unauthed.names).toEqual(["matcher_started"]);
  expect(unauthed.status).toBe(401);
  expect(unauthed.cookie).toBeUndefined();
  expect(unauthed.referer).toBeUndefined();
  expect(unauthed.body).not.toMatch(/85000|Jane|income|\?/i);

  // 3) The matcher keeps working for the signed-in user regardless (re-auth and run it).
  await context.addCookies([{ name: "_vercel_jwt", value: "e2e-test-token", url: BASE, httpOnly: true, sameSite: "Lax" }]);
  await page.fill('input[inputmode="numeric"]', "85000");
  await page.locator('form button:not([type="button"])').click();
  await expect(page.locator("section ul > li").first()).toBeVisible();
});
