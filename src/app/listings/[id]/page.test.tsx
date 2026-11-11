// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Listing } from "@/lib/types";
import { F3 } from "@/lib/matching/fixtures/hn5";

const data = vi.hoisted(() => ({ listings: [] as Listing[], lang: "en" as "en" | "zh" }));
vi.mock("@/lib/data/listings", () => ({ getListings: async () => data.listings, todayNY: () => "2026-11-10" }));
vi.mock("@/lib/lang", () => ({ getLang: async () => data.lang }));
import ListingDetail from "./page";

afterEach(cleanup);

const listing: Listing = { ...F3, id: "synthetic-chart", incomeBands: [{
  amiPercent: 80, unitTypes: ["3br"], householdSizeMin: 3, householdSizeMax: 7,
  minIncome: 42000, maxIncomeByHouseholdSize: { "3": 60000, "4": 70000, "5": 80000, "6": 90000, "7": 100000 },
  monthlyRent: 1200, unitCount: 5,
}] };

describe("listing-specific income chart", () => {
  it.each(["en", "zh"] as const)("%s: preserves minimum income, household limits, and every published household column", async (lang) => {
    data.lang = lang;
    data.listings = [listing];
    render(await ListingDetail({ params: Promise.resolve({ id: listing.id }) }));
    const chart = screen.getByTestId("income-bands");
    expect(chart.textContent).toContain("$42,000");
    expect(chart.textContent).toContain("$100,000");
    expect(chart.textContent).toContain(lang === "en" ? "3–7 people" : "3–7 人");
    expect(chart.textContent).toContain(lang === "en" ? "7 people: $100,000" : "7 人：$100,000");
    expect(screen.queryByTestId("income-incomplete")).toBeNull();
  });

  it.each(["en", "zh"] as const)("%s: makes absent project-specific requirements unmistakable", async (lang) => {
    data.lang = lang;
    data.listings = [{ ...listing, incomeBands: [{ ...listing.incomeBands[0], minIncome: null, maxIncomeByHouseholdSize: null, householdSizeMin: null, householdSizeMax: null, unitTypes: [] }] }];
    render(await ListingDetail({ params: Promise.resolve({ id: listing.id }) }));
    expect(screen.getByTestId("income-incomplete").textContent).toMatch(lang === "en" ? /project-specific.*incomplete/i : /具体收入要求不完整/);
    expect(screen.getByTestId("income-bands").textContent).toContain(lang === "en" ? "General HPD reference maximum" : "HPD 一般参考上限");
    expect(screen.getByTestId("income-bands").textContent).toContain(lang === "en" ? "Sizes (whole building)" : "户型（整栋楼）");
  });
});
