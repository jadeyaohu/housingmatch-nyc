import { describe, expect, it } from "vitest";
import { applyRun, emptyState, liveMuseListings, mergeSources, parseMuseRows, type MuseState } from "./muse";
import { fromOpenData } from "./opendata";
import { DEFAULT_CONFIG, matchListing } from "../matching/engine";

const now = "2026-11-05T15:00:00.000Z";
const later = (d: number) => new Date(Date.parse(now) + d * 86_400_000).toISOString();

// A correct 60% AMI band (HPD 2026: 1p 71,280 · 2p 81,420 · 3p 91,620)
const row = (o: Record<string, string> = {}) => ({
  record_type: "rerental",
  source_name: "Pronto Housing",
  source_url: "https://www.prontohousingrentals.com/listing/abc",
  collected_at: now,
  lottery_id: "",
  name: "The Example",
  borough: "Brooklyn",
  address: "1 Example St",
  application_start_date: "",
  application_end_date: "",
  apply_url: "",
  restrictions: "",
  unit_type: "1BR",
  ami_percent: "60",
  household_size_min: "1",
  household_size_max: "3",
  min_income: "48,000",
  max_income_1: "71,280",
  max_income_2: "81,420",
  max_income_3: "91,620",
  monthly_rent: "1650",
  units_available: "1",
  notes: "",
  ...o,
});

const rowsFor = (source: string, n: number, o: Record<string, string> = {}) =>
  Array.from({ length: n }, (_, i) => row({ source_name: source, name: `Bldg ${i}`, source_url: `https://ex.com/${source}/${i}`, ...o }));

describe("parseMuseRows validation", () => {
  it("accepts a correct row", () => {
    const { listings, rejections } = parseMuseRows([row()], now);
    expect(rejections).toEqual([]);
    expect(listings[0]).toMatchObject({ listingType: "rerental", borough: "Brooklyn", unitTypes: ["1br"] });
    expect(listings[0].incomeBands[0].maxIncomeByHouseholdSize).toEqual({ "1": 71280, "2": 81420, "3": 91620 });
  });

  it("rejects a misread digit (84,120 instead of 81,420) via the AMI cross-check", () => {
    const { listings, rejections } = parseMuseRows([row({ max_income_2: "84,120" })], now);
    expect(listings).toHaveLength(0);
    expect(rejections[0].problems.join()).toMatch(/doesn't match 60% AMI pattern/);
  });

  it("accepts a listing priced on an older AMI table (all sizes scaled equally)", () => {
    // 2025 table ≈ 2026 × 0.9548
    const old = row({ max_income_1: "68,059", max_income_2: "77,740", max_income_3: "87,479", min_income: "40,000" });
    expect(parseMuseRows([old], now).rejections).toEqual([]);
  });

  it("rejects limits far from any plausible AMI table", () => {
    const { rejections } = parseMuseRows([row({ max_income_1: "50,000", max_income_2: "57,100", max_income_3: "64,300", min_income: "30,000" })], now);
    expect(rejections[0].problems.join()).toMatch(/don't match 60% AMI/);
  });

  it("rejects income limits that fall as household size grows", () => {
    const { rejections } = parseMuseRows([row({ ami_percent: "", max_income_2: "61,000" })], now);
    expect(rejections[0].problems.join()).toMatch(/lower than a smaller household/);
  });

  it("quarantines the whole listing if any one band is bad", () => {
    const good = row();
    const bad = row({ unit_type: "2BR", household_size_min: "2", household_size_max: "5", max_income_1: "", max_income_2: "abc" });
    const { listings, rejections } = parseMuseRows([good, bad], now);
    expect(listings).toHaveLength(0);
    expect(rejections).toHaveLength(1);
  });

  it("rejects stale, future and non-link data", () => {
    expect(parseMuseRows([row({ collected_at: "2026-10-01T00:00:00Z" })], now).rejections).toHaveLength(1);
    expect(parseMuseRows([row({ source_url: "prontohousing.com" })], now).rejections).toHaveLength(1);
    expect(parseMuseRows([row({ record_type: "apartment" })], now).rejections).toHaveLength(1);
  });

  it("lotteries need a deadline; waitlists don't need income rows", () => {
    expect(parseMuseRows([row({ record_type: "lottery" })], now).rejections[0].problems.join()).toMatch(/end_date/);
    const wl = row({ record_type: "waitlist", unit_type: "", ami_percent: "", household_size_min: "", household_size_max: "", min_income: "", max_income_1: "", max_income_2: "", max_income_3: "", monthly_rent: "", units_available: "" });
    const { listings } = parseMuseRows([wl], now);
    expect(listings[0]).toMatchObject({ listingType: "waitlist", incomeBands: [] });
  });
});

describe("applyRun auto-publishing", () => {
  it("publishes new valid listings and reports quarantined ones", () => {
    const { state, report } = applyRun(emptyState(), [...rowsFor("A", 3), row({ source_name: "A", name: "Bad", source_url: "https://ex.com/bad", max_income_1: "99999" })], now);
    expect(Object.keys(state.published)).toHaveLength(3);
    expect(report.sources[0]).toMatchObject({ status: "published", accepted: 3, quarantined: 1 });
  });

  it("a changed income table goes live only after a second identical read", () => {
    let s: MuseState = applyRun(emptyState(), [row()], now).state;
    const id = Object.keys(s.published)[0];
    const changed = row({ min_income: "50,000" });
    s = applyRun(s, [changed], later(1)).state;
    expect(s.published[id].listing.incomeBands[0].minIncome).toBe(48000); // old value still live
    expect(s.pending[id]).toBeDefined();
    s = applyRun(s, [changed], later(2)).state;
    expect(s.published[id].listing.incomeBands[0].minIncome).toBe(50000);
    expect(s.pending[id]).toBeUndefined();
  });

  it("removes a listing only after 2 runs in a row without it", () => {
    let s = applyRun(emptyState(), rowsFor("A", 3), now).state;
    const two = rowsFor("A", 2);
    s = applyRun(s, two, later(1)).state;
    expect(Object.keys(s.published)).toHaveLength(3);
    const r = applyRun(s, two, later(2));
    expect(Object.keys(r.state.published)).toHaveLength(2);
    expect(r.report.sources[0].removed).toHaveLength(1);
  });

  it("circuit breaker: a broken run is ignored and old data stays", () => {
    const s = applyRun(emptyState(), rowsFor("A", 6), now).state;
    const broken = rowsFor("A", 6, { max_income_1: "1" });
    const r = applyRun(s, broken, later(1));
    expect(r.report.sources[0].status).toBe("skipped_circuit_breaker");
    expect(Object.keys(r.state.published)).toHaveLength(6);
  });

  it("stale sources drop off the site", () => {
    const s = applyRun(emptyState(), rowsFor("A", 2), now).state;
    expect(liveMuseListings(s, later(3))).toHaveLength(2);
    expect(liveMuseListings(s, later(16))).toHaveLength(0);
  });
});

describe("Housing Connect lottery IDs", () => {
  const hc = (o: Record<string, string> = {}) =>
    row({ record_type: "lottery", source_name: "Housing Connect", source_url: "https://housingconnect.nyc.gov/PublicWeb/details/7667", name: "1333 Broadway Apartments", application_end_date: "2026-11-27", ...o });

  it("takes the lottery ID from the detail link when lottery_id is blank", () => {
    const { listings } = parseMuseRows([hc()], now);
    expect(listings[0]).toMatchObject({ id: "hc-7667", externalId: "7667" });
  });

  it("replaces an entry published earlier under a different id for the same page", () => {
    let s = applyRun(emptyState(), [hc({ source_url: "https://housingconnect.nyc.gov/PublicWeb/details/7667", lottery_id: "" })], now).state;
    // simulate an old entry keyed by name (how the first test run was stored)
    const [only] = Object.values(s.published);
    s = { ...s, published: { "muse-housing-connect-1333-broadway": { ...only, listing: { ...only.listing, id: "muse-housing-connect-1333-broadway" } } } };
    const r = applyRun(s, [hc()], later(1));
    expect(Object.keys(r.state.published)).toEqual(["hc-7667"]);
    expect(r.report.sources[0].removed).toEqual(["muse-housing-connect-1333-broadway"]);
  });
});

describe("mergeSources + matching", () => {
  it("a Muse read of a Housing Connect lottery upgrades an Open Data listing to LIKELY_MATCH", () => {
    const [od] = fromOpenData(
      [{ "Lottery ID": "7607", "Lottery Name": "One River Park", "Lottery Start Date": "09/02/2026", "Lottery End Date": "11/30/2026", "Applied Income AMI Category - Low Income": "20", Borough: "BX" }],
      [],
      "2026-11-05",
    );
    const hh = { size: 2, annualIncome: 60000, boroughs: [], bedrooms: [], hasVoucher: false, hasMember62Plus: false, hasMember55Plus: false, hasDisability: false };
    const cfg = { ...DEFAULT_CONFIG, today: "2026-11-05" };
    expect(matchListing(hh, od, cfg).status).toBe("NEEDS_REVIEW");

    const { listings } = parseMuseRows([row({ record_type: "lottery", source_name: "Housing Connect", lottery_id: "7607", name: "One River Park", borough: "Bronx", application_start_date: "2026-09-02", application_end_date: "2026-11-30" })], now);
    const [merged] = mergeSources([od], listings);
    expect(merged.dataSource).toBe("muse");
    expect(matchListing(hh, merged, cfg).status).toBe("LIKELY_MATCH");
  });

  it("re-rentals with no deadline can be LIKELY_MATCH", () => {
    const { listings } = parseMuseRows([row()], now);
    const hh = { size: 2, annualIncome: 60000, boroughs: [], bedrooms: [], hasVoucher: false, hasMember62Plus: false, hasMember55Plus: false, hasDisability: false };
    expect(matchListing(hh, listings[0], { ...DEFAULT_CONFIG, today: "2026-11-05" }).status).toBe("LIKELY_MATCH");
  });
});
