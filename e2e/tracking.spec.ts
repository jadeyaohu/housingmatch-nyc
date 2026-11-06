import { expect, test, type BrowserContext, type Page, type Request } from "@playwright/test";

/**
 * HN-001 PR 1b real-browser regressions (Codex P2 findings on PR #4):
 *   1. Analytics requests must not carry a Referer (which would leak the page URL incl. query).
 *   2. Tabs that inherit a COPY of sessionStorage (window.open / target=_blank / Duplicate tab)
 *      must rotate hn_sid and the matcher_started once-marker; same-tab reloads must not.
 * No request is mocked; /api/events answers 204 (server ingestion off) and stores nothing.
 */

type Captured = { url: string; referer: string | undefined; body: string; events: { event_name: string; session_id: string; path: string; props: unknown }[] };

function captureEvents(page: Page) {
  const pending: Promise<Captured>[] = [];
  page.on("request", (req: Request) => {
    if (req.method() === "POST" && new URL(req.url()).pathname === "/api/events") {
      pending.push(
        req.allHeaders().then((h) => {
          const body = req.postData() ?? "";
          return { url: req.url(), referer: h["referer"], body, events: JSON.parse(body || "{}").events ?? [] };
        }),
      );
    }
  });
  const all = async () => Promise.all(pending);
  const events = async () => (await all()).flatMap((c) => c.events);
  const waitFor = async (name: string, n = 1) => {
    await expect.poll(async () => (await events()).filter((e) => e.event_name === name).length, { timeout: 10_000 }).toBeGreaterThanOrEqual(n);
  };
  return { all, events, waitFor };
}

async function sidOf(cap: ReturnType<typeof captureEvents>) {
  await cap.waitFor("page_view");
  return (await cap.events()).find((e) => e.event_name === "page_view")!.session_id;
}

async function interact(page: Page) {
  await page.locator('button[aria-label="+"]').click();
}

test.describe("Referer privacy", () => {
  test("analytics requests carry no Referer and no query text, while a control request from the same page would", async ({ page }) => {
    const cap = captureEvents(page);
    const SENSITIVE = "/?income=85000&name=Jane%20Doe&email=jane%40example.com&note=VOUCHER";
    await page.goto(SENSITIVE);
    await cap.waitFor("page_view");

    // Control: an ordinary same-origin fetch from this page DOES send the full URL as Referer in
    // Chromium's default policy — proving the test would catch a regression.
    const control = page.waitForRequest((r) => r.url().endsWith("/__referer_control"));
    await page.evaluate(() => fetch("/__referer_control").catch(() => {}));
    const controlRef = (await (await control).allHeaders())["referer"];
    expect(controlRef).toContain("income=85000");

    // Full flow: start, complete, open details, click apply.
    await page.fill('input[inputmode="numeric"]', "85000");
    await page.locator('form button:not([type="button"])').click();
    await page.waitForSelector("section ul > li");
    await page.locator("section ul > li details summary").first().click();
    await cap.waitFor("listing_details_opened");

    const captured = await cap.all();
    expect(captured.length).toBeGreaterThanOrEqual(4);
    for (const c of captured) {
      expect(c.referer, `Referer on ${c.events.map((e) => e.event_name)}`).toBeUndefined();
      expect(c.body).not.toMatch(/85000|Jane|jane%40|example\.com|VOUCHER|income|email|\?/i);
    }
    expect(new Set((await cap.events()).map((e) => e.path))).toEqual(new Set(["/"]));
  });

  test("listings page with filter query: no Referer, pathname only", async ({ page }) => {
    const cap = captureEvents(page);
    await page.goto("/listings?borough=Bronx&secret=TOKEN123");
    await cap.waitFor("page_view");
    const [c] = await cap.all();
    expect(c.referer).toBeUndefined();
    expect(c.body).not.toMatch(/TOKEN123|borough|Bronx|\?/);
    expect(c.events[0].path).toBe("/listings");
  });
});

test.describe("Per-tab session", () => {
  async function opener(context: BrowserContext) {
    // Record what each new document inherited BEFORE app code runs.
    await context.addInitScript(() => {
      (window as unknown as { __inheritedSid: string | null }).__inheritedSid = sessionStorage.getItem("hn_sid");
    });
    const page = await context.newPage();
    const cap = captureEvents(page);
    await page.goto("/");
    const sid = await sidOf(cap);
    await interact(page);
    await cap.waitFor("matcher_started");
    await page.evaluate(() => sessionStorage.setItem("unrelated_app_state", "keep-me"));
    return { page, cap, sid };
  }

  for (const features of ["", "noopener"]) {
    test(`child tab via window.open(${features ? "'noopener'" : ""}) gets its own session and its own matcher_started`, async ({ context }) => {
      const a = await opener(context);
      const childPromise = context.waitForEvent("page");
      await a.page.evaluate((f) => void window.open("/", "_blank", f), features);
      const child = await childPromise;
      const cc = captureEvents(child);
      await child.waitForLoadState("domcontentloaded");
      const childSid = await sidOf(cc);
      const inherited = await child.evaluate(() => (window as unknown as { __inheritedSid: string | null }).__inheritedSid);
      test.info().annotations.push({ type: "inherited-sessionStorage", description: String(inherited === a.sid) });

      expect(childSid).not.toBe(a.sid);
      await interact(child);
      await cc.waitFor("matcher_started");
      const started = (await cc.events()).filter((e) => e.event_name === "matcher_started");
      expect(started).toHaveLength(1);
      expect(started[0].session_id).toBe(childSid);
      if (inherited === a.sid) {
        // Copy really happened: unrelated keys survive, stale once-marker is gone.
        expect(await child.evaluate(() => sessionStorage.getItem("unrelated_app_state"))).toBe(inherited ? "keep-me" : null);
        expect(await child.evaluate((s) => sessionStorage.getItem(`hn_once:${s}:matcher_started`), a.sid)).toBeNull();
      }
      // The opener's session is untouched.
      expect(await a.page.evaluate(() => sessionStorage.getItem("hn_sid"))).toBe(a.sid);
    });
  }

  test("a tab that starts with a copy of another live tab's sessionStorage (Duplicate tab semantics) rotates", async ({ context }) => {
    const a = await opener(context);
    const snapshot = await a.page.evaluate(() => JSON.stringify({ ...sessionStorage }));
    const dup = await context.newPage();
    await dup.addInitScript((snap) => {
      if (!sessionStorage.getItem("__seeded")) {
        for (const [k, v] of Object.entries(JSON.parse(snap) as Record<string, string>)) sessionStorage.setItem(k, v);
        sessionStorage.setItem("__seeded", "1");
      }
    }, snapshot);
    const dc = captureEvents(dup);
    await dup.goto("/");
    const dupSid = await sidOf(dc);
    expect(dupSid).not.toBe(a.sid);
    await interact(dup);
    await dc.waitFor("matcher_started");
    expect(await dup.evaluate(() => sessionStorage.getItem("unrelated_app_state"))).toBe("keep-me");
  });

  test("same-tab reload keeps the session and does not re-send matcher_started", async ({ context }) => {
    const a = await opener(context);
    await a.page.reload();
    await expect.poll(async () => (await a.cap.events()).filter((e) => e.event_name === "page_view").length).toBe(2);
    const views = (await a.cap.events()).filter((e) => e.event_name === "page_view");
    expect(views[1].session_id).toBe(a.sid);
    await interact(a.page);
    await a.page.waitForTimeout(800);
    expect((await a.cap.events()).filter((e) => e.event_name === "matcher_started")).toHaveLength(1);
    expect(await a.page.evaluate(() => sessionStorage.getItem("unrelated_app_state"))).toBe("keep-me");
  });

  test("same-tab navigation to /listings keeps the session", async ({ context }) => {
    const a = await opener(context);
    await a.page.goto("/listings");
    await expect.poll(async () => (await a.cap.events()).filter((e) => e.event_name === "page_view").length).toBe(2);
    const views = (await a.cap.events()).filter((e) => e.event_name === "page_view");
    expect(views.map((v) => [v.path, v.session_id])).toEqual([["/", a.sid], ["/listings", a.sid]]);
  });
});
