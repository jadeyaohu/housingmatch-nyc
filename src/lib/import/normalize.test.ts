import { describe, expect, it } from "vitest";
import { lifecycle, normalizeRows, parseBorough, parseDate, parseUnitTypes } from "./normalize";

const today = "2026-11-05";

describe("parsers", () => {
  it("boroughs", () => {
    expect(parseBorough("BK")).toBe("Brooklyn");
    expect(parseBorough("the bronx")).toBe("Bronx");
    expect(parseBorough("staten  island")).toBe("Staten Island");
    expect(parseBorough("Jersey City")).toBeNull();
  });
  it("dates", () => {
    expect(parseDate("2026-12-01T00:00:00.000")).toBe("2026-12-01");
    expect(parseDate("3/7/2026")).toBe("2026-03-07");
    expect(parseDate("soon")).toBeNull();
  });
  it("unit types", () => {
    expect(parseUnitTypes("Studio, 1 BR, 2-bed")).toEqual(["studio", "1br", "2br"]);
    expect(parseUnitTypes(["4 BR"])).toEqual(["4br+"]);
  });
});

describe("normalizeRows", () => {
  it("never fabricates missing fields and reports them", () => {
    const { listings, issues } = normalizeRows([{ "Lottery Name": "Sample", Borough: "Queens" }], today);
    expect(listings[0].applicationDeadline).toBeNull();
    expect(listings[0].incomeBands).toEqual([]);
    expect(listings[0].status).toBe("unknown");
    expect(issues.map((i) => i.field)).toEqual(expect.arrayContaining(["incomeBands", "applicationDeadline"]));
  });

  it("skips rows without a name and duplicate ids", () => {
    const { listings, issues } = normalizeRows(
      [{ name: "" }, { name: "A", lottery_id: "1" }, { name: "A again", lottery_id: "1" }],
      today,
    );
    expect(listings).toHaveLength(1);
    expect(issues.filter((i) => /skipped/.test(i.message))).toHaveLength(2);
  });

  it("marks an 'open' lottery with a past deadline as closed", () => {
    const { listings } = normalizeRows([{ name: "X", status: "Open", deadline: "2026-10-01" }], today);
    expect(listings[0].status).toBe("closed");
  });

  it("parses income bands from a JSON string", () => {
    const bands = JSON.stringify([{ ami_percent: 60, min_income: 40000, household_size_min: 1, household_size_max: 3 }]);
    const { listings } = normalizeRows([{ name: "X", income_bands: bands }], today);
    expect(listings[0].incomeBands[0]).toMatchObject({ amiPercent: 60, minIncome: 40000, householdSizeMax: 3 });
  });
});

describe("lifecycle", () => {
  const base = normalizeRows([{ name: "X", status: "open", start_date: "2026-11-01", deadline: "2026-12-30" }], today).listings[0];
  it("new / closing soon", () => {
    expect(lifecycle(base, today)).toBe("new");
    expect(lifecycle({ ...base, applicationDeadline: "2026-11-10" }, today)).toBe("closing_soon");
    expect(lifecycle({ ...base, applicationOpenDate: "2026-09-01" }, today)).toBe("open");
  });
});
