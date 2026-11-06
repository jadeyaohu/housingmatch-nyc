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
 * navigator.sendBeacon is captured; /api/match is mocked via fetch.
 */

type Sent = { event_name: string; props: Record<string, unknown>; lang: string; path: string; session_id: string; source: string; event_id: string };
let beacons: Blob[] = [];
let fetchMock: ReturnType<typeof vi.fn>;

async function sent(): Promise<Sent[]> {
  const out: Sent[] = [];
  for (const b of beacons) out.push(...(JSON.parse(await b.text()).events as Sent[]));
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
  __resetAnalyticsMemory();
  beacons = [];
  Object.defineProperty(navigator, "sendBeacon", {
    configurable: true,
    value: vi.fn((_url: string, data: Blob) => (beacons.push(data), true)),
  });
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
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
  it.each([undefined, "false", "1", "TRUE"])("sends nothing and never touches sessionStorage when NEXT_PUBLIC_ANALYTICS_ENABLED=%s", async (v) => {
    if (v === undefined) delete process.env.NEXT_PUBLIC_ANALYTICS_ENABLED;
    else process.env.NEXT_PUBLIC_ANALYTICS_ENABLED = v;
    matchOk();
    render(<><PageViewTracker lang="en" /><Matcher lang="en" /></>);
    fireEvent.change(incomeInput(), { target: { value: "85000" } });
    await submitForm(/see my matches|find my matches|check/i);
    await screen.findByText("Project hc-1");
    expect(beacons).toHaveLength(0);
    expect(fetchMock.mock.calls.filter(([u]) => u === "/api/events")).toHaveLength(0);
    expect(sessionStorage.length).toBe(0);
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

  it("maps utm_source to an allow-listed channel and keeps it for the session", async () => {
    window.history.replaceState({}, "", "/?utm_source=xiaohongshu&utm_campaign=x");
    render(<PageViewTracker lang="zh" />);
    window.history.replaceState({}, "", "/listings");
    cleanup();
    render(<PageViewTracker lang="zh" />);
    expect((await sent()).map((e) => e.source)).toEqual(["xiaohongshu", "xiaohongshu"]);
  });
});

describe("matcher_started", () => {
  it("fires on first interaction only, once per tab session (even across remounts)", async () => {
    render(<Matcher lang="en" />);
    expect(beacons).toHaveLength(0);
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

  it("starts again in a new tab session", async () => {
    render(<Matcher lang="en" />);
    fireEvent.click(screen.getByRole("button", { name: "+" }));
    cleanup();
    sessionStorage.clear(); // new tab
    __resetAnalyticsMemory();
    render(<Matcher lang="en" />);
    fireEvent.click(screen.getByRole("button", { name: "+" }));
    expect(await names()).toEqual(["matcher_started", "matcher_started"]);
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
    const raw = (await Promise.all(beacons.map((b) => b.text()))).join("");
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
      sessionStorage.clear();
      fetchMock.mockImplementation(impl);
      render(<Matcher lang="en" />);
      fireEvent.change(incomeInput(), { target: { value: "85000" } });
      await submitForm(/see my matches|find my matches|check/i);
      await waitFor(() => expect(fetchMock).toHaveBeenCalled());
      expect((await names()).includes("matcher_completed")).toBe(false);
    }
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

  it("tracking never interferes with matching: results render even if sendBeacon throws", async () => {
    Object.defineProperty(navigator, "sendBeacon", { configurable: true, value: () => { throw new Error("blocked"); } });
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
    beacons = [];
  }
  const openDetails = (i: number, open = true) => {
    const d = document.querySelectorAll("details")[i] as HTMLDetailsElement;
    d.open = open;
    fireEvent(d, new Event("toggle"));
  };

  it("results render sends nothing; expanding details sends one event per listing", async () => {
    await withResults();
    expect(beacons).toHaveLength(0);
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
    expect(beacons).toHaveLength(0);
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
    expect(beacons).toHaveLength(0);
    fireEvent.click(screen.getByRole("link", { name: "申请 ↗" }));
    expect((await sent()).map((e) => [e.event_name, e.props, e.lang])).toEqual([["application_link_clicked", { listing_id: "hc-9", from: "listings" }, "zh"]]);
  });

  it("drops an event whose listing id doesn't match the allow-list pattern", async () => {
    render(<TrackedLink href="https://example.org/a" listingId="bad id with spaces" from="listings" lang="en">Apply</TrackedLink>);
    fireEvent.click(screen.getByRole("link", { name: "Apply" }));
    expect(beacons).toHaveLength(0);
  });
});

describe("session id and payload contract", () => {
  it("uses one random UUID per tab session, stored in sessionStorage only", async () => {
    render(<><PageViewTracker lang="en" /><Matcher lang="en" /></>);
    fireEvent.click(screen.getByRole("button", { name: "+" }));
    const ev = await sent();
    expect(new Set(ev.map((e) => e.session_id)).size).toBe(1);
    expect(ev[0].session_id).toMatch(/^[0-9a-f-]{36}$/);
    expect(sessionStorage.getItem("hn_sid")).toBe(ev[0].session_id);
    expect(document.cookie).not.toMatch(/hn_/);
    expect(new Set(ev.map((e) => e.event_id)).size).toBe(ev.length);
  });

  it("falls back to an in-memory session when sessionStorage is blocked", async () => {
    const spy = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("blocked"); });
    render(<PageViewTracker lang="en" />);
    spy.mockRestore();
    expect(await names()).toEqual(["page_view"]);
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
    expect(beacons.length).toBe(5);
    for (const b of beacons) {
      const res = await handleEvents(
        new Request("https://housingmatch.test/api/events", {
          method: "POST",
          headers: { "content-type": b.type, host: "housingmatch.test" },
          body: await b.text(),
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
