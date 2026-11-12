// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Matcher } from "@/components/Matcher";
import { MatchResults, type Row } from "@/components/MatchResults";
import { DEFAULT_CONFIG, matchAll } from "@/lib/matching/engine";
import { ALL_FIXTURES, F1, F2, F3, F7, HH_3_85K, TODAY } from "@/lib/matching/fixtures/hn5";

/** Results exactly as /api/match would return them for the synthetic fixtures (JSON round-trip). */
const rowsFor = (listings = ALL_FIXTURES, h = HH_3_85K): Row[] =>
  JSON.parse(JSON.stringify(matchAll(h, listings, { ...DEFAULT_CONFIG, today: TODAY })));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const card = (id: string) => screen.getByTestId(`result-${id}`);

describe("sections and counts", () => {
  it("separates LIKELY from NEEDS_REVIEW with counts that don't merge them; UNLIKELY hidden by default", () => {
    render(<MatchResults rows={rowsFor()} lang="en" />);
    expect(screen.getByTestId("result-counts").textContent).toBe("1 look like a fit · 4 might fit (details missing) · 2 not shown");
    const likely = screen.getByTestId("section-LIKELY_MATCH");
    const review = screen.getByTestId("section-NEEDS_REVIEW");
    expect(within(likely).getByRole("heading", { level: 3 }).textContent).toMatch(/^Looks like a fit — based on the income limits we have \(1\)$/);
    expect(within(review).getByRole("heading", { level: 3 }).textContent).toMatch(/^Might fit — we're missing some details, please check \(4\)$/);
    expect(within(likely).queryByTestId("result-hc-90001")).toBeNull();
    expect(within(review).getByTestId("result-hc-90001")).toBeTruthy();
    expect(screen.queryByTestId("section-UNLIKELY_MATCH")).toBeNull();
    // LIKELY section is rendered before NEEDS_REVIEW in document order
    expect(likely.compareDocumentPosition(review) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByText(/not an official eligibility decision/)).toBeTruthy();
  });

  it("showing unlikely adds a third section without changing the other counts", () => {
    render(<MatchResults rows={rowsFor()} lang="en" />);
    fireEvent.click(screen.getByRole("checkbox"));
    expect(within(screen.getByTestId("section-UNLIKELY_MATCH")).getAllByRole("listitem").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByTestId("result-counts").textContent).toBe("1 look like a fit · 4 might fit (details missing) · 2 not shown");
  });

  it("中文: section titles, counts and badges use cautious wording", () => {
    render(<MatchResults rows={rowsFor()} lang="zh" />);
    expect(screen.getByTestId("result-counts").textContent).toBe("看起来符合 1 个 · 可能符合 4 个（缺少部分资料）· 未显示 2 个");
    expect(within(screen.getByTestId("section-LIKELY_MATCH")).getByRole("heading", { level: 3 }).textContent).toContain("看起来符合（根据我们现有的收入要求）");
    expect(within(screen.getByTestId("section-NEEDS_REVIEW")).getByRole("heading", { level: 3 }).textContent).toContain("可能符合（我们缺少部分资料，请再核对）");
    expect(document.body.textContent).not.toMatch(/确认符合|官方批准/);
  });
});

describe("F1 card (345-like)", () => {
  it.each([
    ["en", ["The income limit for your household size isn't in our data.", "Household-size limits aren't in our data.", "Confirm on Housing Connect before applying."], "Closes in 3 days", "Unit sizes listed by the source: Studio"],
    ["zh", ["我们的数据中没有您这个家庭人数对应的收入上限。", "我们的数据中没有家庭人数限制。", "申请前请在 Housing Connect 上核实。"], "3 天后截止", "来源列出的户型：开间"],
  ] as const)("%s: warnings, closing chip, units listed, provenance, official link", (lang, warnings, closing, units) => {
    render(<MatchResults rows={rowsFor()} lang={lang} />);
    const c = card("hc-90001");
    const box = within(c).getByTestId("quality-warnings");
    for (const w of warnings) expect(box.textContent).toContain(w);
    expect(box.textContent).toContain(units);
    expect(within(c).getByTestId("closing-soon").textContent).toBe(closing);
    expect(within(c).getByTestId("provenance").textContent).toBe(lang === "en" ? "Source: NYC Open Data · Not manually verified" : "来源: NYC Open Data · 未经人工核实");
    const link = within(c).getByRole("link", { name: /official|官方/i });
    expect(link.getAttribute("href")).toBe("https://housingconnect.nyc.gov/PublicWeb/details/90001");
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toBe("noopener noreferrer");
    expect(within(c).queryByTestId("fits")).toBeNull();
  });

  it("unknown outcomes render as ? — never ✓", () => {
    render(<MatchResults rows={rowsFor()} lang="en" />);
    const c = card("hc-90001");
    const unknowns = c.querySelectorAll('[data-outcome="unknown"]');
    expect(unknowns.length).toBe(2);
    unknowns.forEach((li) => expect(li.textContent?.startsWith("?")).toBe(true));
    c.querySelectorAll('[data-outcome="pass"]').forEach((li) => expect(li.textContent?.startsWith("✓")).toBe(true));
  });
});

describe("F2 card (6-05-like Open Data)", () => {
  it("is in the Possible section, flags unit pairing, names no unit and shows no dollar amounts", () => {
    render(<MatchResults rows={rowsFor()} lang="en" />);
    const c = within(screen.getByTestId("section-NEEDS_REVIEW")).getByTestId("result-hc-90002");
    expect(within(c).getByTestId("quality-warnings").textContent).toContain("Our data doesn't say which income levels go with which unit sizes.");
    expect(within(c).queryByTestId("fits")).toBeNull();
    expect(within(c).queryByTestId("closing-soon")).toBeNull(); // 5 days
    expect(c.textContent).not.toMatch(/\$\s?\d|84,103|96,652/);
  });
});

describe("F3 card (published chart)", () => {
  it("shows only the facts from qualifying bands and no 'confirm' line", () => {
    render(<MatchResults rows={rowsFor()} lang="en" />);
    const c = within(screen.getByTestId("section-LIKELY_MATCH")).getByTestId("result-hc-90003");
    expect(within(c).getByTestId("fits").textContent).toBe("Fits income limits in our data for 1 BR (130% AMI)");
    expect(c.textContent).not.toContain("Confirm on Housing Connect before applying.");
    expect(within(c).getByTestId("provenance").textContent).toBe("Auto-collected from: Housing Connect · 2026-11-06 · Not manually verified");
    expect(within(c).getByRole("link", { name: /official|官方/i }).getAttribute("href")).toBe("https://housingconnect.nyc.gov/PublicWeb/details/90003");
  });
});

describe("PR #4 analytics integration seam", () => {
  it("fires onDetailsOpen on expand only, and onOfficialLinkClick on left/middle click only", () => {
    const onDetailsOpen = vi.fn();
    const onOfficialLinkClick = vi.fn();
    render(<MatchResults rows={rowsFor([F1, F3])} lang="en" onDetailsOpen={onDetailsOpen} onOfficialLinkClick={onOfficialLinkClick} />);
    expect(onDetailsOpen).not.toHaveBeenCalled();
    const d = card("hc-90001").querySelector("details") as HTMLDetailsElement;
    d.open = true;
    fireEvent(d, new Event("toggle"));
    d.open = false;
    fireEvent(d, new Event("toggle"));
    expect(onDetailsOpen.mock.calls).toEqual([["hc-90001"]]);
    const link = within(card("hc-90003")).getByRole("link", { name: /official|官方/i });
    fireEvent.mouseOver(link);
    fireEvent.click(link);
    fireEvent(link, new MouseEvent("auxclick", { bubbles: true, button: 1 }));
    fireEvent(link, new MouseEvent("auxclick", { bubbles: true, button: 2 }));
    expect(onOfficialLinkClick.mock.calls).toEqual([["hc-90003"], ["hc-90003"]]);
  });
});

describe("Matcher integration", () => {
  it("renders sectioned results from /api/match; the request body is unchanged", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ results: rowsFor([F1, F2, F3]) }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    render(<Matcher lang="en" />);
    fireEvent.click(screen.getByRole("button", { name: "+" }));
    fireEvent.change(screen.getByPlaceholderText("65,000"), { target: { value: "85000" } });
    await act(async () => {
      fireEvent.submit(screen.getByPlaceholderText("65,000").closest("form")!);
    });
    await screen.findByTestId("section-LIKELY_MATCH");
    expect(screen.getByTestId("result-counts").textContent).toBe("1 look like a fit · 2 might fit (details missing) · 0 not shown");
    // every NEEDS_REVIEW card carries the confirmation line
    for (const id of ["hc-90001", "hc-90002"]) expect(within(card(id)).getByTestId("review-confirm").textContent).toBe("Confirm on Housing Connect before applying.");
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("/api/match");
    expect(JSON.parse(String(init.body))).toEqual({
      size: 3, annualIncome: 85000, boroughs: [], bedrooms: [], hasVoucher: false, hasMember62Plus: false, hasMember55Plus: false, hasDisability: false,
    });
  });

  it.each(["en", "zh"] as const)("%s: older payloads without `quality` still show a confirmation and the engine's unknown reasons", (lang) => {
    const rows = rowsFor([F2, F7]).map((r) => ({ ...r, result: { ...r.result, quality: undefined } }));
    render(<MatchResults rows={rows} lang={lang} />);
    for (const id of ["hc-90002", "hc-90007"]) {
      const c = card(id);
      expect(within(c).getByTestId("review-confirm").textContent).toBe(lang === "en" ? "Confirm on Housing Connect before applying." : "申请前请在 Housing Connect 上核实。");
      expect(within(c).queryByTestId("closing-soon")).toBeNull();
      expect(within(c).queryAllByRole("listitem").filter((li) => li.getAttribute("data-warning"))).toHaveLength(0);
    }
    // without quality, every unknown rule's own reason is shown (F2: household_size + income; F7: restrictions)
    const f2 = [...card("hc-90002").querySelectorAll("[data-unknown-rule]")].map((li) => li.getAttribute("data-unknown-rule"));
    expect(f2).toEqual(["household_size", "income"]);
    const f7 = [...card("hc-90007").querySelectorAll("[data-unknown-rule]")].map((li) => li.getAttribute("data-unknown-rule"));
    expect(f7).toEqual(["restrictions"]);
    expect(document.body.textContent).not.toMatch(/85,?000/); // no raw user input echoed
  });
});

describe("F7 — complete income data, unknown restriction (Codex P2 regression)", () => {
  it.each([
    ["en", "Confirm on Housing Connect before applying.", "This lottery may have veteran-related preferences or eligibility rules; check the official listing."],
    ["zh", "申请前请在 Housing Connect 上核实。", "该项目涉及退伍军人相关优先权或资格规定，请查看官方要求。"],
  ] as const)("%s: card shows the restriction reason and a confirmation even with zero quality warnings", (lang, confirm, reason) => {
    render(<MatchResults rows={rowsFor([F7])} lang={lang} />);
    const c = within(screen.getByTestId("section-NEEDS_REVIEW")).getByTestId("result-hc-90007");
    expect(within(c).getByTestId("review-confirm").textContent).toBe(confirm);
    const reasons = within(c).getByTestId("unknown-reasons");
    expect(reasons.textContent).toBe(`?${reason}`);
    expect(c.textContent).not.toMatch(/\bveteran\b(?!-related)/); // raw code never shown
    expect(c.querySelectorAll("[data-warning]")).toHaveLength(0);
    expect(within(c).queryByTestId("fits")).toBeNull();
    expect(within(c).getByTestId("provenance").textContent).toBe(
      lang === "en" ? "Auto-collected from: Housing Connect · 2026-11-06 · Not manually verified" : "自动采集自: Housing Connect · 2026-11-06 · 未经人工核实",
    );
    // Why section and rule statuses are unchanged
    expect([...c.querySelectorAll("[data-outcome]")].map((li) => li.getAttribute("data-outcome"))).toEqual(["pass", "pass", "pass", "unknown"]);
  });

  it("every NEEDS_REVIEW card across all fixtures has a confirmation line (EN and 中文)", () => {
    for (const lang of ["en", "zh"] as const) {
      cleanup();
      render(<MatchResults rows={rowsFor()} lang={lang} />);
      const cards = within(screen.getByTestId("section-NEEDS_REVIEW")).getAllByRole("listitem").filter((li) => li.dataset.testid?.startsWith("result-"));
      expect(cards.length).toBe(4);
      for (const c of cards) expect(within(c).getByTestId("review-confirm").textContent).toBeTruthy();
    }
  });
});

describe("long lists", () => {
  it("shows 10 per section, then 'Show more' reveals more without changing the counts", async () => {
    const { fireEvent } = await import("@testing-library/react");
    const base = rowsFor().find((r) => r.result.status === "NEEDS_REVIEW")!;
    const many = Array.from({ length: 23 }, (_, i) => ({ ...base, listing: { ...base.listing, id: `x-${i}`, projectName: `P${i}` } }));
    render(<MatchResults rows={many} lang="en" />);
    const sec = screen.getByTestId("section-NEEDS_REVIEW");
    expect(sec.querySelectorAll("[data-testid^=\"result-x-\"]")).toHaveLength(10);
    expect(screen.getByTestId("result-counts").textContent).toContain("23 might fit");
    fireEvent.click(screen.getByTestId("more-NEEDS_REVIEW"));
    expect(sec.querySelectorAll("[data-testid^=\"result-x-\"]")).toHaveLength(23);
    expect(screen.queryByTestId("more-NEEDS_REVIEW")).toBeNull();
  });
});

describe('income fit versus budget clarity',()=>{it.each(['en','zh']as const)('%s distinguishes a likely income fit that exceeds budget',lang=>{const row=rowsFor().find(r=>r.result.status==='LIKELY_MATCH')!;row.lifestyle={borough:null,size:null,budget:'no',rentFrom:1574};render(<MatchResults rows={[row]} lang={lang}/>);expect(within(card(row.listing.id)).getByText(lang==='en'?'Income looks like a fit · over budget':'收入初步匹配 · 超出租金预算')).toBeTruthy();expect(row.result.status).toBe('LIKELY_MATCH');});});
