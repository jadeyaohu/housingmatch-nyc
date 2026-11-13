import { describe, expect, it } from "vitest";
import { availabilityOf, isSecondary } from "./availability";
import { listingToRow, rowToListing } from "./data/mapping";
import type { Listing } from "./types";

const today = "2026-11-09";
const base: Listing = {
  id: "x", externalId: null, projectName: "X", borough: "Bronx", address: null, housingProgram: null,
  unitTypes: [], incomeBands: [], restrictions: [], isRerental: false, applicationOpenDate: null,
  applicationDeadline: null, applicationUrl: null, sourceUrl: null, status: "open", lastVerifiedAt: null, eligibilityNotes: null,
};

describe("availabilityOf", () => {
  it("lottery with a future deadline is verified open; past deadline is closed", () => {
    expect(availabilityOf({ ...base, applicationDeadline: "2026-11-20" }, today)).toBe("verified_open");
    expect(availabilityOf({ ...base, applicationDeadline: "2026-11-08" }, today)).toBe("confirmed_closed");
    expect(availabilityOf({ ...base, status: "closed", applicationDeadline: "2026-12-01" }, today)).toBe("confirmed_closed");
  });

  it("a missing deadline alone never makes a listing open", () => {
    expect(availabilityOf({ ...base, applicationDeadline: null }, today)).toBe("unverified");
    expect(availabilityOf({ ...base, listingType: "rerental", collectedAt: null }, today)).toBe("unverified");
  });

  it("re-rentals and waitlists are verified only if seen within 7 days", () => {
    const rr = { ...base, listingType: "rerental" as const };
    expect(availabilityOf({ ...rr, collectedAt: "2026-11-05T15:00:00Z" }, today)).toBe("verified_open");
    expect(availabilityOf({ ...rr, collectedAt: "2026-10-30T15:00:00Z" }, today)).toBe("unverified");
    expect(availabilityOf({ ...base, listingType: "waitlist", collectedAt: "2026-11-08T12:00:00Z" }, today)).toBe("verified_waitlist");
  });

  it("keeps legacy database re-rentals out of primary lottery results", () => {
    const legacy = rowToListing(listingToRow({ ...base, isRerental: true, lastVerifiedAt: today }));
    expect(legacy.listingType).toBeUndefined();
    expect(isSecondary(legacy)).toBe(true);
    expect(availabilityOf(legacy, today)).toBe("verified_open");
  });

  it.each(["rerental", "waitlist"] as const)("a fresh %s observation does not prove unknown/upcoming availability", (listingType) => {
    for (const status of ["unknown", "upcoming"] as const) {
      expect(availabilityOf({ ...base, listingType, status, collectedAt: "2026-11-09T12:00:00Z" }, today)).toBe("unverified");
    }
  });

  it("does not verify any listing before its published application opening date", () => {
    for (const listingType of ["lottery", "rerental", "waitlist"] as const) {
      expect(availabilityOf({ ...base, listingType, applicationOpenDate: "2026-11-10", applicationDeadline: "2026-11-20", collectedAt: "2026-11-09T12:00:00Z" }, today)).toBe("unverified");
    }
  });

  it("rejects future observations while comparing timestamp dates in New York", () => {
    const rr = { ...base, listingType: "rerental" as const };
    expect(availabilityOf({ ...rr, collectedAt: "2026-12-01T12:00:00Z" }, today)).toBe("unverified");
    expect(availabilityOf({ ...rr, collectedAt: "2026-11-10T12:00:00Z" }, today)).toBe("unverified");
    // Nov 10 UTC is still Nov 9 in NYC at this hour: not a future observation.
    expect(availabilityOf({ ...rr, collectedAt: "2026-11-10T02:00:00Z" }, today)).toBe("verified_open");
  });

  it("handles the 7-day boundary and invalid observation dates conservatively", () => {
    const rr = { ...base, listingType: "rerental" as const };
    expect(availabilityOf({ ...rr, lastVerifiedAt: "2026-11-02" }, today)).toBe("verified_open");
    expect(availabilityOf({ ...rr, lastVerifiedAt: "2026-11-01" }, today)).toBe("unverified");
    expect(availabilityOf({ ...rr, collectedAt: "not-a-date" }, today)).toBe("unverified");
    expect(availabilityOf({ ...rr, lastVerifiedAt: "2026-02-31" }, "2026-03-04")).toBe("unverified");
  });

  it("does not assume an unknown-source waiting list has an official deadline", () => {
    const waitlist = { ...base, listingType: "waitlist" as const, applicationDeadline: "2026-11-20" };
    expect(availabilityOf(waitlist, today)).toBe("unverified");
    expect(availabilityOf({ ...waitlist, dataSource: "opendata" }, today)).toBe("verified_waitlist");
  });
});
