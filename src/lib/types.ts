// Core domain types. Every field that may be missing from source data is
// nullable — the app must never invent a value that the source didn't publish.

export const BOROUGHS = ["Manhattan", "Brooklyn", "Queens", "Bronx", "Staten Island"] as const;
export type Borough = (typeof BOROUGHS)[number];

export const UNIT_TYPES = ["studio", "1br", "2br", "3br", "4br+"] as const;
export type UnitType = (typeof UNIT_TYPES)[number];

export type ListingStatus =
  | "open" // accepting applications
  | "upcoming" // announced, not yet open
  | "closed" // deadline passed
  | "unknown";

export type HouseholdRestriction = "senior_62plus" | "senior_55plus" | "disability" | "veteran" | "student" | "none";

/** One income band as published for a listing (one row of a lottery's income table). */
export interface IncomeBand {
  /** AMI percentage this band is set at, e.g. 40, 60, 130. Null if the listing doesn't say. */
  amiPercent: number | null;
  /**
   * Lower edge of the band's AMI range when only an HPD income category is known
   * (e.g. "Low Income" = 51–80% AMI → amiMinPercent 51, amiPercent 80). Used only
   * to flag households that may be below the band; never as a hard minimum.
   */
  amiMinPercent?: number | null;
  /** HPD income category label from Open Data, e.g. "Low Income". */
  amiCategory?: string | null;
  /** Unit types this band applies to. Empty = applies to all units in the listing. */
  unitTypes: UnitType[];
  householdSizeMin: number | null;
  householdSizeMax: number | null;
  /** Explicit published minimum annual income (all household sizes). */
  minIncome: number | null;
  /**
   * Explicit published maximum annual income keyed by household size,
   * e.g. { "1": 71280, "2": 81420 }. Takes precedence over amiPercent.
   */
  maxIncomeByHouseholdSize: Record<string, number> | null;
  monthlyRent: number | null;
  unitCount: number | null;
}

export type ListingType = "lottery" | "rerental" | "waitlist";
export type DataSource = "opendata" | "muse" | "manual";

export interface Listing {
  id: string;
  /** Defaults to "lottery" when absent. */
  listingType?: ListingType;
  /** Where the record came from, e.g. "opendata" or "muse". */
  dataSource?: DataSource;
  /** Human-readable source name, e.g. "Housing Connect", "Pronto Housing". */
  sourceName?: string | null;
  /** When an automated collector last read the source page (ISO datetime). */
  collectedAt?: string | null;
  externalId: string | null; // e.g. Housing Connect Lottery ID
  projectName: string;
  borough: Borough | null;
  address: string | null;
  housingProgram: string | null;
  unitTypes: UnitType[];
  incomeBands: IncomeBand[];
  restrictions: HouseholdRestriction[];
  isRerental: boolean;
  applicationOpenDate: string | null; // ISO date
  applicationDeadline: string | null; // ISO date
  applicationUrl: string | null;
  sourceUrl: string | null;
  status: ListingStatus;
  lastVerifiedAt: string | null; // ISO date
  eligibilityNotes: string | null;
  /** True for demo rows that are not real listings. */
  isSample?: boolean;
}

export interface Household {
  size: number;
  annualIncome: number;
  boroughs: Borough[]; // empty = any
  bedrooms: UnitType[]; // empty = any
  hasVoucher: boolean; // Section 8 / CityFHEPS / other rental subsidy
  hasMember62Plus: boolean | null;
  hasMember55Plus: boolean | null;
  hasDisability: boolean | null;
}

export type MatchStatus = "LIKELY_MATCH" | "NEEDS_REVIEW" | "UNLIKELY_MATCH";

export interface Bilingual {
  en: string;
  zh: string;
}

export interface RuleOutcome {
  rule: string;
  result: "pass" | "fail" | "unknown";
  reason: Bilingual;
}

export interface MatchResult {
  listingId: string;
  status: MatchStatus;
  /** Matches the household's borough / bedroom preferences (not an eligibility test). */
  matchesPreferences: boolean;
  outcomes: RuleOutcome[];
  /** Income bands the household appears to fit. */
  qualifyingBands: IncomeBand[];
}
