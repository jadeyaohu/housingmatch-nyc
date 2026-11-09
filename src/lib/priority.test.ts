import { describe, expect, it } from "vitest";
import { districtLabel, priorityFit } from "./priority";
import type { Listing } from "./types";

const base = { id: "x", externalId: null, projectName: "T", borough: "Bronx", address: null, housingProgram: null, unitTypes: [], incomeBands: [], restrictions: [], isRerental: false, applicationOpenDate: null, applicationDeadline: null, applicationUrl: null, sourceUrl: null, status: "open", lastVerifiedAt: null, eligibilityNotes: null } as unknown as Listing;
const withPrefs = (cd: string | null, c = 50, n = 25, m = 5): Listing => ({ ...base, preferences: { communityDistrict: cd, communityPct: c, nychaPct: n, municipalVetPct: m } });

describe("priorityFit", () => {
  it("returns nothing when the listing publishes no preferences", () => {
    expect(priorityFit(base, { zip: "10451", nycha: true, municipalVet: true })).toEqual([]);
  });

  it("never says 'no' for the community preference without a ZIP", () => {
    const items = priorityFit(withPrefs("203"), { zip: null, nycha: null, municipalVet: null });
    expect(items.map((i) => [i.kind, i.fit])).toEqual([["community", "unknown"], ["nycha", "unknown"], ["municipal_vet", "unknown"]]);
  });

  it("uses yes/no answers for NYCHA and city employee / veteran", () => {
    const items = priorityFit(withPrefs("203"), { zip: null, nycha: true, municipalVet: false });
    expect(items.find((i) => i.kind === "nycha")?.fit).toBe("yes");
    expect(items.find((i) => i.kind === "municipal_vet")?.fit).toBe("no");
  });

  it("community: single-district ZIP in the listing's district is yes; another borough is no", () => {
    const single = findZip((cds) => cds.length === 1);
    expect(single).not.toBeNull();
    const [zip, [cd]] = single!;
    expect(priorityFit(withPrefs(cd), { zip, nycha: null, municipalVet: null })[0].fit).toBe("yes");
    const otherBoro = String(((Number(cd[0]) % 5) + 1)) + "01";
    expect(priorityFit(withPrefs(otherBoro), { zip, nycha: null, municipalVet: null })[0].fit).toBe("no");
  });

  it("community: unknown ZIP or a ZIP spanning districts stays unknown", () => {
    expect(priorityFit(withPrefs("203"), { zip: "99999", nycha: null, municipalVet: null })[0].fit).toBe("unknown");
    const multi = findZip((cds) => cds.length > 1);
    if (multi) expect(priorityFit(withPrefs(multi[1][0]), { zip: multi[0], nycha: null, municipalVet: null })[0].fit).toBe("unknown");
  });
});

describe("districtLabel", () => {
  it("formats codes", () => {
    expect(districtLabel("203", "en")).toBe("Bronx Community District 3");
    expect(districtLabel("412", "zh")).toBe("皇后区第 12 社区区");
    expect(districtLabel("Multiple", "en")).toBeNull();
  });
});

import zipMap from "./data/zip-districts.json";
function findZip(pred: (cds: string[]) => boolean): [string, string[]] | null {
  for (const [z, cds] of Object.entries(zipMap as Record<string, string[]>)) if (pred(cds)) return [z, cds];
  return null;
}
