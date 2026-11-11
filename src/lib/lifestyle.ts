// Lifestyle fit: a separate dimension from eligibility. Three-valued on purpose —
// "unknown" (the source doesn't say) is never treated as "no", and never hides a listing.

import type { Borough, Listing, UnitType } from "./types";

export type Tri = "yes" | "no" | "unknown";

export interface LifestylePrefs {
  boroughs: Borough[]; // empty = anywhere
  bedrooms: UnitType[]; // empty = any size
  rentMax: number | null; // monthly; null = no budget given
}

export interface LifestyleFit {
  borough: Tri | null; // null = user didn't express a preference
  size: Tri | null;
  budget: Tri | null;
  /** Lowest published monthly rent, if any. */
  rentFrom: number | null;
}

export function lifestyleFit(l: Listing, p: LifestylePrefs): LifestyleFit {
  const rents = l.incomeBands.map((b) => b.monthlyRent).filter((r): r is number => r != null);
  const rentFrom = rents.length ? Math.min(...rents) : null;

  const borough: Tri | null = p.boroughs.length === 0 ? null : l.borough == null ? "unknown" : p.boroughs.includes(l.borough) ? "yes" : "no";
  const size: Tri | null =
    p.bedrooms.length === 0 ? null : l.unitTypes.length === 0 ? "unknown" : l.unitTypes.some((u) => p.bedrooms.includes(u)) ? "yes" : "no";
  const budget: Tri | null = p.rentMax == null ? null : rentFrom == null ? "unknown" : rentFrom <= p.rentMax ? "yes" : "no";

  return { borough, size, budget, rentFrom };
}
