import { expect, test, type Page, type Request } from "@playwright/test";

/**
 * HN-001 PR 1b real-browser regressions:
 *   1. Analytics requests must not carry a Referer (which would leak the page URL incl. query).
 *   2. Document-visit ids (PO Option A): one random id per document load, shared by every event
 *      in that document; reloads, full navigations and new/copied tabs get fresh ids; nothing is
 *      kept in browser storage, so inherited storage copies cannot share ids.
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

test.describe("Document-visit id", () => {
  const ids = (evs: { event_name: string; session_id: string }[]) => evs.map((e) => [e.event_name, e.session_id]);

  test("complete funnel in one document, with slow human pauses, is attributed to a single visit id", async ({ page }) => {
    const cap = captureEvents(page);
    await page.goto("/");
    const sid = await sidOf(cap);
    await page.waitForTimeout(1500);
    await page.fill('input[inputmode="numeric"]', "85000");
    await page.waitForTimeout(1500);
    await page.locator('form button:not([type="button"])').click();
    await page.waitForSelector("section ul > li");
    await page.waitForTimeout(1500);
    await page.locator("section ul > li details summary").first().click();
    const link = page.locator("section ul > li a[target=_blank]").first();
    await link.scrollIntoViewIfNeeded();
    await link.click();
    await cap.waitFor("application_link_clicked");
    const evs = await cap.events();
    expect(evs.map((e) => e.event_name)).toEqual(["page_view", "matcher_started", "matcher_completed", "listing_details_opened", "application_link_clicked"]);
    expect(new Set(evs.map((e) => e.session_id))).toEqual(new Set([sid]));
    expect(await page.evaluate(() => [sessionStorage.length, localStorage.length])).toEqual([0, 0]);
  });

  test("reload starts a new visit: new id, and matcher_started can fire again", async ({ page }) => {
    const cap = captureEvents(page);
    await page.goto("/");
    const first = await sidOf(cap);
    await interact(page);
    await cap.waitFor("matcher_started");
    await page.reload();
    await cap.waitFor("page_view", 2);
    await interact(page);
    await cap.waitFor("matcher_started", 2);
    const evs = await cap.events();
    expect(ids(evs)).toEqual([
      ["page_view", first],
      ["matcher_started", first],
      ["page_view", evs[2].session_id],
      ["matcher_started", evs[2].session_id],
    ]);
    expect(evs[2].session_id).not.toBe(first);
  });

  test("matcher_started is sent once per visit, however many interactions", async ({ page }) => {
    const cap = captureEvents(page);
    await page.goto("/");
    await sidOf(cap);
    for (let i = 0; i < 4; i++) await interact(page);
    await page.fill('input[inputmode="numeric"]', "1234");
    await page.waitForTimeout(500);
    expect((await cap.events()).filter((e) => e.event_name === "matcher_started")).toHaveLength(1);
  });

  test("client-side navigation (header link) stays in the document → same id; full navigation → new id", async ({ page }) => {
    const cap = captureEvents(page);
    await page.goto("/");
    const sid = await sidOf(cap);
    await page.locator('header a[href="/listings"]').click(); // Next.js <Link>
    await page.waitForURL("**/listings");
    await cap.waitFor("page_view", 2);
    await page.goto("/"); // full document load
    await cap.waitFor("page_view", 3);
    const views = (await cap.events()).filter((e) => e.event_name === "page_view");
    expect(views.map((v) => v.path)).toEqual(["/", "/listings", "/"]);
    expect(views[1].session_id).toBe(sid);
    expect(views[2].session_id).not.toBe(sid);
  });

  for (const features of ["", "noopener"]) {
    test(`a tab opened with window.open(${features ? "'noopener'" : ""}) gets an independent visit id`, async ({ context }) => {
      const page = await context.newPage();
      const cap = captureEvents(page);
      await page.goto("/");
      const sid = await sidOf(cap);
      await interact(page);
      await cap.waitFor("matcher_started");
      const childP = context.waitForEvent("page");
      await page.evaluate((f) => void window.open("/", "_blank", f), features);
      const child = await childP;
      const cc = captureEvents(child);
      const childSid = await sidOf(cc);
      expect(childSid).not.toBe(sid);
      await interact(child);
      await cc.waitFor("matcher_started");
      expect((await cc.events()).every((e) => e.session_id === childSid)).toBe(true);
      // the opener's later events keep its own id
      await page.locator('header a[href="/listings"]').click();
      await cap.waitFor("page_view", 2);
      expect((await cap.events()).every((e) => e.session_id === sid)).toBe(true);
    });
  }

  test("a tab started with a full copy of another tab's storage (Duplicate-tab semantics) is independent", async ({ context }) => {
    const page = await context.newPage();
    const cap = captureEvents(page);
    await page.goto("/");
    const sid = await sidOf(cap);
    await interact(page);
    await cap.waitFor("matcher_started");
    const dup = await context.newPage();
    // Simulate inherited storage, including legacy hn_* keys from earlier builds.
    await dup.addInitScript((s) => {
      sessionStorage.setItem("hn_sid", s);
      sessionStorage.setItem(`hn_once:${s}:matcher_started`, "1");
      sessionStorage.setItem("unrelated_app_state", "keep-me");
    }, sid);
    const dc = captureEvents(dup);
    await dup.goto("/");
    const dupSid = await sidOf(dc);
    expect(dupSid).not.toBe(sid);
    await interact(dup);
    await dc.waitFor("matcher_started");
    expect(await dup.evaluate(() => sessionStorage.getItem("unrelated_app_state"))).toBe("keep-me");
  });

  test("two tabs running the funnel concurrently never share an id", async ({ context }) => {
    const [a, b] = [await context.newPage(), await context.newPage()];
    const [ca, cb] = [captureEvents(a), captureEvents(b)];
    await Promise.all([a.goto("/"), b.goto("/")]);
    await Promise.all([interact(a), interact(b)]);
    await Promise.all([ca.waitFor("matcher_started"), cb.waitFor("matcher_started")]);
    const sa = new Set((await ca.events()).map((e) => e.session_id));
    const sb = new Set((await cb.events()).map((e) => e.session_id));
    expect(sa.size).toBe(1);
    expect(sb.size).toBe(1);
    expect([...sa][0]).not.toBe([...sb][0]);
  });
});
