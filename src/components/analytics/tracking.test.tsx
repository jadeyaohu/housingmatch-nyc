// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { StrictMode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Matcher } from "@/components/Matcher";
import { PageViewTracker } from "@/components/analytics/PageViewTracker";
import { TrackedLink } from "@/components/analytics/TrackedLink";
import { __resetAnalyticsMemory, bucket } from "@/lib/analytics/client";
import { handleEvents, type Deps } from "@/lib/analytics/handler";
import type { EventRow } from "@/lib/analytics/schema";

/**
 * Component + integration tests for HN-001 PR 1b (frontend anonymous tracking).
 * fetch("/api/events") calls are captured; fetch("/api/match") is answered by `fetchMock`.
 */

type Sent = { event_name: string; props: Record<string, unknown>; lang: string; path: string; session_id: string; source: string; event_id: string };
type Posted = { body: string; init: RequestInit };
let beacons: Posted[] = []; // every POST /api/events made by the client
let eventsFetchImpl: (() => Promise<Response>) | null = null;
let fetchMock: ReturnType<typeof vi.fn>;

const flush = () => new Promise((r) => setTimeout(r, 10)); // emit() awaits the session check
async function sent(): Promise<Sent[]> {
  await flush();
  const out: Sent[] = [];
  for (const b of beacons) out.push(...(JSON.parse(b.body).events as Sent[]));
  return out;
}
const names = async () => (await sent()).map((e) => e.event_name);

const listing = (id: string, status: "LIKELY_MATCH" | "NEEDS_REVIEW" | "UNLIKELY_MATCH", url = `https://example.org/apply/${id}`) => ({
  listing: {
    id,
    projectName: `Project ${id}`,
    borough: "Bronx",
    unitTypes: ["1BR"],
    incomeBands: [],
    applicationUrl: url,
    applicationDeadline: "2026-12-31",
    sourceName: "Housing Connect",
  },
  result: {
    status,
    matchesPreferences: true,
    outcomes: [{ rule: "income", result: "pass", reason: { en: "Income in range", zh: "收入符合" } }],
  },
});

function matchOk(results = [listing("hc-1", "LIKELY_MATCH"), listing("hc-2", "NEEDS_REVIEW"), listing("hc-3", "LIKELY_MATCH")]) {
  fetchMock.mockImplementation(async (url: string) => {
    if (url === "/api/match") return new Response(JSON.stringify({ results }), { status: 200, headers: { "content-type": "application/json" } });
    return new Response(null, { status: 204 });
  });
}

beforeEach(() => {
  process.env.NEXT_PUBLIC_ANALYTICS_ENABLED = "true";
  sessionStorage.clear();
  localStorage.clear();
  __resetAnalyticsMemory();
  beacons = [];
  eventsFetchImpl = null;
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", (url: string, init: RequestInit = {}) => {
    if (url === "/api/events") {
      beacons.push({ body: String(init.body), init });
      return eventsFetchImpl ? eventsFetchImpl() : Promise.resolve(new Response(null, { status: 204 }));
    }
    return fetchMock(url, init);
  });
  window.history.replaceState({}, "", "/");
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  delete process.env.NEXT_PUBLIC_ANALYTICS_ENABLED;
});

const incomeInput = () => screen.getByPlaceholderText("65,000");
const submitForm = async (label: RegExp | string) => {
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: label }));
  });
};

describe("feature flag", () => {
  it.each([undefined, "false", "1", "TRUE"])("sends nothing, generates nothing and touches no storage when NEXT_PUBLIC_ANALYTICS_ENABLED=%s", async (v) => {
    if (v === undefined) delete process.env.NEXT_PUBLIC_ANALYTICS_ENABLED;
    else process.env.NEXT_PUBLIC_ANALYTICS_ENABLED = v;
    const RealBC = globalThis.BroadcastChannel;
    const bcSpy = vi.fn();
    vi.stubGlobal("BroadcastChannel", class extends RealBC { constructor(n: string) { super(n); bcSpy(n); } });
    const uuidSpy = vi.spyOn(crypto, "randomUUID");
    matchOk();
    render(<><PageViewTracker lang="en" /><Matcher lang="en" /></>);
    fireEvent.change(incomeInput(), { target: { value: "85000" } });
    await submitForm(/see my matches|find my matches|check/i);
    await screen.findByText("Project hc-1");
    expect(await names()).toEqual([]);
    expect(sessionStorage.length).toBe(0);
    expect(localStorage.length).toBe(0);
    expect(document.cookie).toBe("");
    expect(bcSpy).not.toHaveBeenCalled();
    expect(uuidSpy).not.toHaveBeenCalled();
  });
});

describe("page_view", () => {
  it("is the only event on initial render", async () => {
    render(<><PageViewTracker lang="en" /><Matcher lang="en" /></>);
    expect(await names()).toEqual(["page_view"]);
  });

  it("fires once under React StrictMode (dev double effects)", async () => {
    render(<StrictMode><PageViewTracker lang="en" /></StrictMode>);
    expect(await names()).toEqual(["page_view"]);
  });

  it("does not fire again when the language changes (EN → 中文 re-render)", async () => {
    const { rerender } = render(<PageViewTracker lang="en" />);
    rerender(<PageViewTracker lang="zh" />);
    const ev = await sent();
    expect(ev.map((e) => e.event_name)).toEqual(["page_view"]);
    expect(ev[0].lang).toBe("en");
  });

  it("records the listings path and a 中文 language tag", async () => {
    window.history.replaceState({}, "", "/listings?borough=Bronx");
    render(<PageViewTracker lang="zh" />);
    const [e] = await sent();
    expect(e.path).toBe("/listings"); // query string never sent
    expect(e.lang).toBe("zh");
  });

  it("maps utm_source to an allow-listed channel for the whole document visit (incl. client-side route changes), without storage", async () => {
    window.history.replaceState({}, "", "/?utm_source=xiaohongshu&utm_campaign=x");
    render(<PageViewTracker lang="zh" />);
    window.history.replaceState({}, "", "/listings"); // client-side <Link> navigation: same document
    cleanup();
    render(<PageViewTracker lang="zh" />);
    const ev = await sent();
    expect(ev.map((e) => e.source)).toEqual(["xiaohongshu", "xiaohongshu"]);
    expect(new Set(ev.map((e) => e.session_id)).size).toBe(1);
    expect(sessionStorage.length).toBe(0);
  });
});

describe("matcher_started", () => {
  it("fires on first interaction only, once per document visit (even across remounts / client-side navigation)", async () => {
    render(<Matcher lang="en" />);
    expect(await names()).toEqual([]);
    fireEvent.change(incomeInput(), { target: { value: "5" } });
    fireEvent.change(incomeInput(), { target: { value: "50000" } });
    fireEvent.click(screen.getByRole("button", { name: "+" }));
    cleanup();
    render(<Matcher lang="en" />);
    fireEvent.click(screen.getByRole("button", { name: "+" }));
    expect(await names()).toEqual(["matcher_started"]);
  });

  it("fires on a chip click as the first interaction", async () => {
    render(<Matcher lang="en" />);
    fireEvent.click(screen.getAllByRole("button", { pressed: false })[0]);
    expect(await names()).toEqual(["matcher_started"]);
  });

  it("starts again in a new document visit (reload / new tab), with a new visit id", async () => {
    render(<Matcher lang="en" />);
    fireEvent.click(screen.getByRole("button", { name: "+" }));
    cleanup();
    __resetAnalyticsMemory(); // = new document load
    render(<Matcher lang="en" />);
    fireEvent.click(screen.getByRole("button", { name: "+" }));
    const ev = await sent();
    expect(ev.map((e) => e.event_name)).toEqual(["matcher_started", "matcher_started"]);
    expect(ev[0].session_id).not.toBe(ev[1].session_id);
  });
});

describe("matcher_completed", () => {
  it("fires only after a successful /api/match, with bucketed counts and no inputs", async () => {
    matchOk();
    render(<Matcher lang="en" />);
    fireEvent.change(incomeInput(), { target: { value: "85000" } });
    await submitForm(/see my matches|find my matches|check/i);
    await screen.findByText("Project hc-1");
    const done = (await sent()).filter((e) => e.event_name === "matcher_completed");
    expect(done).toHaveLength(1);
    expect(done[0].props).toEqual({ likely_count: "1-5", review_count: "1-5", has_borough_pref: false });
    const raw = beacons.map((b) => b.body).join("");
    expect(raw).not.toMatch(/85000|annualIncome|income|size|voucher|disability|hasMember/i);
  });

  it("does not fire when /api/match returns an error status", async () => {
    fetchMock.mockImplementation(async () => new Response("{}", { status: 500 }));
    render(<Matcher lang="en" />);
    fireEvent.change(incomeInput(), { target: { value: "85000" } });
    await submitForm(/see my matches|find my matches|check/i);
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(await names()).toEqual(["matcher_started"]);
  });

  it("does not fire on network failure or an unparseable body", async () => {
    for (const impl of [async () => { throw new TypeError("network"); }, async () => new Response("not json", { status: 200 })]) {
      cleanup();
      beacons = [];
      __resetAnalyticsMemory();
      fetchMock.mockImplementation(impl);
      render(<Matcher lang="en" />);
      fireEvent.change(incomeInput(), { target: { value: "85000" } });
      await submitForm(/see my matches|find my matches|check/i);
      await waitFor(() => expect(fetchMock).toHaveBeenCalled());
      expect((await names()).includes("matcher_completed")).toBe(false);
    }
  });

  it.each([
    ["results: null", { results: null }],
    ["results: {}", { results: {} }],
    ["results missing", {}],
    ["body null", null],
  ])("malformed 200 (%s): shows the error state, renders no results, sends no matcher_completed", async (_l, body) => {
    fetchMock.mockImplementation(async () => new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } }));
    render(<Matcher lang="en" />);
    fireEvent.change(incomeInput(), { target: { value: "85000" } });
    await submitForm(/see my matches|find my matches|check/i);
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(await screen.findByText(/something went wrong|error|try again/i)).toBeTruthy();
    expect(screen.queryByRole("list")).toBeNull();
    expect((await names()).includes("matcher_completed")).toBe(false);
  });

  it("recovers after a malformed response: the next good response renders and is tracked", async () => {
    fetchMock.mockImplementationOnce(async () => new Response(JSON.stringify({ results: {} }), { status: 200 }));
    render(<Matcher lang="en" />);
    fireEvent.change(incomeInput(), { target: { value: "85000" } });
    await submitForm(/see my matches|find my matches|check/i);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    matchOk();
    await submitForm(/see my matches|find my matches|check/i);
    expect(await screen.findByText("Project hc-1")).toBeTruthy();
    expect((await names()).filter((n) => n === "matcher_completed")).toHaveLength(1);
  });

  it("reports has_borough_pref when a borough chip is selected", async () => {
    matchOk([]);
    render(<Matcher lang="en" />);
    fireEvent.click(screen.getByRole("button", { name: "Bronx" }));
    fireEvent.change(incomeInput(), { target: { value: "85000" } });
    await submitForm(/see my matches|find my matches|check/i);
    await waitFor(async () => expect(await names()).toContain("matcher_completed"));
    const done = (await sent()).find((e) => e.event_name === "matcher_completed")!;
    expect(done.props).toEqual({ likely_count: "0", review_count: "0", has_borough_pref: true });
  });

  it("tracking never interferes with matching: results render even if the events request fails", async () => {
    eventsFetchImpl = () => Promise.reject(new TypeError("blocked by extension"));
    matchOk();
    render(<Matcher lang="en" />);
    fireEvent.change(incomeInput(), { target: { value: "85000" } });
    await submitForm(/see my matches|find my matches|check/i);
    expect(await screen.findByText("Project hc-2")).toBeTruthy();
    const matchCall = fetchMock.mock.calls.find(([u]) => u === "/api/match")!;
    expect(JSON.parse(matchCall[1].body)).toMatchObject({ annualIncome: 85000, size: 2 }); // request unchanged
  });

  it("works the same in 中文 (lang tag zh, Chinese UI intact)", async () => {
    matchOk();
    render(<Matcher lang="zh" />);
    fireEvent.change(incomeInput(), { target: { value: "85000" } });
    await act(async () => {
      fireEvent.submit(incomeInput().closest("form")!);
    });
    await screen.findByText("Project hc-1");
    expect(screen.getAllByText("收入符合").length).toBeGreaterThan(0);
    const ev = await sent();
    expect(ev.map((e) => e.event_name)).toEqual(["matcher_started", "matcher_completed"]);
    expect(ev.every((e) => e.lang === "zh")).toBe(true);
  });
});

describe("listing_details_opened and application_link_clicked", () => {
  async function withResults() {
    matchOk();
    render(<Matcher lang="en" />);
    fireEvent.change(incomeInput(), { target: { value: "85000" } });
    await submitForm(/see my matches|find my matches|check/i);
    await screen.findByText("Project hc-1");
    await flush();
    beacons = [];
  }
  const openDetails = (i: number, open = true) => {
    const d = document.querySelectorAll("details")[i] as HTMLDetailsElement;
    d.open = open;
    fireEvent(d, new Event("toggle"));
  };

  it("results render sends nothing; expanding details sends one event per listing", async () => {
    await withResults();
    expect(await names()).toEqual([]);
    openDetails(0);
    openDetails(0, false); // collapsing sends nothing
    openDetails(0); // re-opening the same listing is not a new event
    openDetails(1);
    const ev = await sent();
    expect(ev.map((e) => [e.event_name, e.props.listing_id])).toEqual([
      ["listing_details_opened", "hc-1"],
      ["listing_details_opened", "hc-2"],
    ]);
  });

  it("application link: hover sends nothing, click sends one event, middle click counts", async () => {
    await withResults();
    const link = screen.getAllByRole("link")[0];
    fireEvent.mouseOver(link);
    expect(await names()).toEqual([]);
    fireEvent.click(link);
    fireEvent(link, new MouseEvent("auxclick", { bubbles: true, button: 1 }));
    fireEvent(link, new MouseEvent("auxclick", { bubbles: true, button: 2 })); // right click: no
    const ev = await sent();
    expect(ev.map((e) => [e.event_name, e.props])).toEqual([
      ["application_link_clicked", { listing_id: "hc-1", from: "results" }],
      ["application_link_clicked", { listing_id: "hc-1", from: "results" }],
    ]);
    expect(link.getAttribute("href")).toBe("https://example.org/apply/hc-1");
    expect(link.getAttribute("target")).toBe("_blank");
  });

  it("TrackedLink on the listings page tags from=listings and renders without sending", async () => {
    render(<TrackedLink href="https://example.org/a" listingId="hc-9" from="listings" lang="zh">申请 ↗</TrackedLink>);
    expect(await names()).toEqual([]);
    fireEvent.click(screen.getByRole("link", { name: "申请 ↗" }));
    expect((await sent()).map((e) => [e.event_name, e.props, e.lang])).toEqual([["application_link_clicked", { listing_id: "hc-9", from: "listings" }, "zh"]]);
  });

  it("drops an event whose listing id doesn't match the allow-list pattern", async () => {
    render(<TrackedLink href="https://example.org/a" listingId="bad id with spaces" from="listings" lang="en">Apply</TrackedLink>);
    fireEvent.click(screen.getByRole("link", { name: "Apply" }));
    expect(await names()).toEqual([]);
  });
});

describe("document-visit id and payload contract", () => {
  it("one random UUID per document visit, shared by every event in the full funnel, never stored", async () => {
    const bc = vi.fn();
    const RealBC = globalThis.BroadcastChannel;
    vi.stubGlobal("BroadcastChannel", class extends RealBC { constructor(n: string) { super(n); bc(n); } });
    matchOk();
    render(<><PageViewTracker lang="en" /><Matcher lang="en" /></>);
    fireEvent.change(incomeInput(), { target: { value: "85000" } });
    await new Promise((r) => setTimeout(r, 300)); // user pauses
    await submitForm(/see my matches|find my matches|check/i);
    await screen.findByText("Project hc-1");
    await new Promise((r) => setTimeout(r, 300));
    const d = document.querySelector("details") as HTMLDetailsElement;
    d.open = true;
    fireEvent(d, new Event("toggle"));
    fireEvent.click(screen.getAllByRole("link")[0]);
    const ev = await sent();
    expect(ev.map((e) => e.event_name)).toEqual(["page_view", "matcher_started", "matcher_completed", "listing_details_opened", "application_link_clicked"]);
    expect(new Set(ev.map((e) => e.session_id)).size).toBe(1);
    expect(ev[0].session_id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(new Set(ev.map((e) => e.event_id)).size).toBe(ev.length);
    expect(sessionStorage.length).toBe(0);
    expect(localStorage.length).toBe(0);
    expect(document.cookie).toBe("");
    expect(bc).not.toHaveBeenCalled(); // no cross-tab coordination at all
  });

  it("works even when storage APIs throw (none are used)", async () => {
    const spy = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("blocked"); });
    const spySet = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("blocked"); });
    render(<PageViewTracker lang="en" />);
    expect(await names()).toEqual(["page_view"]);
    expect(spy).not.toHaveBeenCalled();
    expect(spySet).not.toHaveBeenCalled();
    spy.mockRestore();
    spySet.mockRestore();
  });

  it("ignores any legacy hn_* keys left in sessionStorage by earlier builds", async () => {
    sessionStorage.setItem("hn_sid", "11111111-2222-4333-8444-555555555555");
    sessionStorage.setItem("hn_once:11111111-2222-4333-8444-555555555555:matcher_started", "1");
    render(<Matcher lang="en" />);
    fireEvent.click(screen.getByRole("button", { name: "+" }));
    const [e] = await sent();
    expect(e.event_name).toBe("matcher_started");
    expect(e.session_id).not.toBe("11111111-2222-4333-8444-555555555555");
  });

  it("integration: every payload the browser builds is accepted by the real /api/events handler", async () => {
    await (async () => {
      matchOk();
      render(<><PageViewTracker lang="zh" /><Matcher lang="zh" /></>);
      fireEvent.change(incomeInput(), { target: { value: "85000" } });
      await act(async () => {
        fireEvent.submit(incomeInput().closest("form")!);
      });
      await screen.findByText("Project hc-1");
      const d = document.querySelector("details") as HTMLDetailsElement;
      d.open = true;
      fireEvent(d, new Event("toggle"));
      fireEvent.click(screen.getAllByRole("link")[0]);
    })();
    const rows: EventRow[] = [];
    const deps: Deps = {
      env: {
        ANALYTICS_INGEST_ENABLED: "true",
        UPSTASH_REDIS_REST_URL: "x", UPSTASH_REDIS_REST_TOKEN: "x", RATE_LIMIT_HMAC_SECRET: "x",
        NEXT_PUBLIC_SUPABASE_URL: "x", SUPABASE_SERVICE_ROLE_KEY: "x",
      },
      storeConfigured: () => true,
      getLimiter: async () => ({ limit: async () => ({ success: true, reset: 0 }) }),
      getStore: () => ({ insert: async (r) => void rows.push(...r) }),
    };
    await flush();
    expect(beacons.length).toBe(5);
    await flush();
    for (const b of beacons) {
      const res = await handleEvents(
        new Request("https://housingmatch.test/api/events", {
          method: "POST",
          headers: { "content-type": (b.init.headers as Record<string, string>)["Content-Type"], host: "housingmatch.test" },
          body: b.body,
        }),
        deps,
      );
      expect(res.status).toBe(202);
    }
    expect(rows.map((r) => r.event_name)).toEqual([
      "page_view", "matcher_started", "matcher_completed", "listing_details_opened", "application_link_clicked",
    ]);
  });
});

describe("bucket()", () => {
  it.each([[0, "0"], [-1, "0"], [NaN, "0"], [1, "1-5"], [5, "1-5"], [6, "6-20"], [20, "6-20"], [21, "20+"], [999, "20+"]])("%s → %s", (n, b) => {
    expect(bucket(n as number)).toBe(b);
  });
});

describe("delivery privacy (unit; real-browser proof lives in e2e/)", () => {
  it("sends with fetch keepalive, no Referer, same-origin credentials, no beacon", async () => {
    const beacon = vi.fn(() => true);
    Object.defineProperty(navigator, "sendBeacon", { configurable: true, value: beacon });
    window.history.replaceState({}, "", "/listings?income=85000&name=Jane");
    render(<PageViewTracker lang="en" />);
    await flush();
    expect(beacon).not.toHaveBeenCalled();
    expect(beacons).toHaveLength(1);
    expect(beacons[0].init).toMatchObject({ method: "POST", keepalive: true, referrerPolicy: "no-referrer", credentials: "same-origin" });
    expect(beacons[0].body).not.toMatch(/income|85000|Jane|\?/);
  });
});

describe("attribution precedence", () => {
  const setReferrer = (v: string) => Object.defineProperty(document, "referrer", { configurable: true, value: v });
  afterEach(() => setReferrer(""));

  it("utm_source wins over the referrer", async () => {
    setReferrer("https://www.instagram.com/p/abc");
    window.history.replaceState({}, "", "/?utm_source=xiaohongshu");
    render(<PageViewTracker lang="en" />);
    expect((await sent())[0].source).toBe("xiaohongshu");
  });

  it("falls back to the referrer host, ignores same-host referrers, maps unknown hosts to other", async () => {
    const cases: [string, string][] = [
      ["https://www.instagram.com/p/abc", "instagram"],
      [`${window.location.origin}/listings`, "direct"],
      ["https://news.example.com/x", "other"],
      ["", "direct"],
    ];
    for (const [ref, want] of cases) {
      cleanup();
      __resetAnalyticsMemory();
      beacons = [];
      setReferrer(ref);
      render(<PageViewTracker lang="en" />);
      expect((await sent())[0].source, ref).toBe(want);
    }
  });
});

describe("match-count metric definition", () => {
  it("counts ALL returned rows by status, including matchesPreferences=false rows hidden in the UI", async () => {
    const hidden = (id: string, status: "LIKELY_MATCH" | "NEEDS_REVIEW") => {
      const r = listing(id, status);
      r.result.matchesPreferences = false;
      return r;
    };
    matchOk([listing("hc-1", "LIKELY_MATCH"), hidden("hc-2", "LIKELY_MATCH"), hidden("hc-3", "NEEDS_REVIEW"), listing("hc-4", "UNLIKELY_MATCH")]);
    render(<Matcher lang="en" />);
    fireEvent.change(incomeInput(), { target: { value: "85000" } });
    await submitForm(/see my matches|find my matches|check/i);
    await screen.findByText("Project hc-1");
    expect(screen.queryByText("Project hc-2")).toBeNull(); // hidden by preferences
    const done = (await sent()).find((e) => e.event_name === "matcher_completed")!;
    expect(done.props).toEqual({ likely_count: "1-5", review_count: "1-5", has_borough_pref: false });
  });
});

