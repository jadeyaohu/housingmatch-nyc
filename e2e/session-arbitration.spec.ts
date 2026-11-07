import { expect, test, type BrowserContext, type Page } from "@playwright/test";

/**
 * Late-claim arbitration (PR #4 P2), in real Chromium:
 *   - a BUSY owner that misses the 150 ms probe window still makes the copy rotate later,
 *     and the copy re-sends its funnel-entry events under its own id;
 *   - two copies opened at the same time with no owner end up with distinct ids
 *     (older keeps, newer rotates).
 */
type Ev = { event_name: string; session_id: string };

function capture(page: Page) {
  const out: Ev[] = [];
  page.on("request", (r) => {
    if (r.method() === "POST" && new URL(r.url()).pathname === "/api/events") out.push(...((JSON.parse(r.postData() ?? "{}").events ?? []) as Ev[]));
  });
  return out;
}

async function seededPage(context: BrowserContext, snapshot: string) {
  const p = await context.newPage();
  await p.addInitScript((snap) => {
    if (!sessionStorage.getItem("__seeded")) {
      for (const [k, v] of Object.entries(JSON.parse(snap) as Record<string, string>)) sessionStorage.setItem(k, v);
      sessionStorage.setItem("__seeded", "1");
    }
  }, snapshot);
  return p;
}

async function ownerTab(context: BrowserContext) {
  const owner = await context.newPage();
  const ev = capture(owner);
  await owner.goto("/");
  await expect.poll(() => ev.length).toBeGreaterThanOrEqual(1);
  await owner.locator('button[aria-label="+"]').click(); // marks matcher_started for this session
  await expect.poll(() => ev.filter((e) => e.event_name === "matcher_started").length).toBe(1);
  await owner.evaluate(() => sessionStorage.setItem("unrelated_app_state", "keep-me"));
  const sid = ev[0].session_id;
  const snapshot = await owner.evaluate(() => JSON.stringify({ ...sessionStorage }));
  return { owner, ev, sid, snapshot };
}

test("busy owner (2.5 s) misses the probe window, then late-claims: the copy rotates and re-sends entry events", async ({ context }) => {
  const { owner, ev: ownerEv, sid, snapshot } = await ownerTab(context);
  const copy = await seededPage(context, snapshot);
  const copyEv = capture(copy);

  // Block the owner's main thread for 2.5 s while the copy loads and interacts.
  const busy = owner.evaluate(() => {
    const t = Date.now();
    while (Date.now() - t < 2500) {}
  });
  await copy.goto("/");
  await expect.poll(() => copyEv.length, { timeout: 10_000 }).toBeGreaterThanOrEqual(1);
  await copy.locator('button[aria-label="+"]').click();
  // During the busy window the copy necessarily used the inherited id (the reported defect):
  expect(copyEv[0]).toMatchObject({ event_name: "page_view", session_id: sid });
  await busy;

  // After the owner frees up it processes the queued probe/hello and claims → copy rotates.
  await expect
    .poll(() => copyEv.filter((e) => e.session_id !== sid).map((e) => e.event_name).sort(), { timeout: 10_000 })
    .toEqual(["matcher_started", "page_view"]);
  const newSid = copyEv.find((e) => e.session_id !== sid)!.session_id;
  expect(await copy.evaluate(() => sessionStorage.getItem("hn_sid"))).toBe(newSid);
  expect(await copy.evaluate(() => sessionStorage.getItem("unrelated_app_state"))).toBe("keep-me");

  // Later copy events use the new id; the owner keeps its id and its single matcher_started.
  await copy.reload();
  await expect.poll(() => copyEv.filter((e) => e.event_name === "page_view").length).toBe(3);
  expect(copyEv.at(-1)!.session_id).toBe(newSid);
  await owner.reload();
  await expect.poll(() => ownerEv.filter((e) => e.event_name === "page_view").length).toBe(2);
  expect(ownerEv.at(-1)!.session_id).toBe(sid);
  expect(ownerEv.filter((e) => e.event_name === "matcher_started")).toHaveLength(1);
});

test("two copies opened concurrently with no live owner end with distinct ids (older keeps, newer rotates)", async ({ context }) => {
  const { owner, sid, snapshot } = await ownerTab(context);
  await owner.close(); // original gone: neither copy gets a probe answer
  const a = await seededPage(context, snapshot);
  const b = await seededPage(context, snapshot);
  const aEv = capture(a);
  const bEv = capture(b);
  await Promise.all([a.goto("/"), b.goto("/")]);
  const finalSid = async (p: Page) => p.evaluate(() => sessionStorage.getItem("hn_sid"));
  await expect.poll(async () => new Set([await finalSid(a), await finalSid(b)]).size, { timeout: 10_000 }).toBe(2);
  const sids = [await finalSid(a), await finalSid(b)];
  expect(sids.filter((s) => s === sid)).toHaveLength(1); // exactly one kept the inherited id
  // Each tab has a page_view under its own final id.
  await expect.poll(() => aEv.some((e) => e.event_name === "page_view" && e.session_id === sids[0])).toBe(true);
  await expect.poll(() => bEv.some((e) => e.event_name === "page_view" && e.session_id === sids[1])).toBe(true);
});
