import { describe, expect, it } from "vitest";
import { availabilityOf } from "./availability";
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
});
