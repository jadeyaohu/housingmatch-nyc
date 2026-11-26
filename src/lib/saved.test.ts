import { describe, expect, it } from "vitest";
import { savedItems } from "./saved";
import type { Listing } from "./types";

const base = { externalId: null, borough: "Bronx", address: null, housingProgram: null, unitTypes: [], incomeBands: [], restrictions: [], isRerental: false, applicationOpenDate: null, applicationUrl: "https://x/1", sourceUrl: null, status: "open", lastVerifiedAt: null, eligibilityNotes: null } as const;
const L = (id: string, deadline: string | null, status = "open"): Listing => ({ ...base, id, projectName: id, applicationDeadline: deadline, status } as unknown as Listing);

describe("savedItems", () => {
  const today = "2026-11-09";
  it("orders closing-soon first, closed and missing last; never invents a deadline", () => {
    const out = savedItems(["far", "soon", "past", "gone", "none"], [L("far", "2026-12-20"), L("soon", "2026-11-12"), L("past", "2026-11-01", "closed"), L("none", null)], today, () => "");
    expect(out.map((i) => [i.id, i.state, i.daysLeft])).toEqual([
      ["soon", "closing", 3],
      ["far", "open", 41],
      ["none", "unknown", null],
      ["past", "closed", null],
      ["gone", "closed", null],
    ]);
    expect(out.find((i) => i.id === "gone")!.name).toBe("");
  });
});
