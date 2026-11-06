// HPD "2026 New York City Area AMI" table — maximum gross annual household
// income by AMI % and household size (1–8).
// Source: https://www.nyc.gov/site/hpd/services-and-information/area-median-income.page
// Retrieved 2026-11-05. HPD publishes a new table each spring after HUD releases
// income limits — update this file (and AMI_TABLE_YEAR) when that happens.
//
// IMPORTANT: a listing's own published income table always governs. This table is
// only used to *estimate* a band's maximum when a listing gives an AMI % but no
// dollar figures. Minimum incomes are never derived from it.

export const AMI_TABLE_YEAR = 2026;
export const AMI_SOURCE_URL = "https://www.nyc.gov/site/hpd/services-and-information/area-median-income.page";

export const AMI_TABLE: Record<number, readonly number[]> = {
  20: [23760, 27140, 30540, 33920, 36640, 39360, 42080, 44780],
  30: [35640, 40710, 45810, 50880, 54960, 59040, 63120, 67170],
  40: [47520, 54280, 61080, 67840, 73280, 78720, 84160, 89560],
  50: [59400, 67850, 76350, 84800, 91600, 98400, 105200, 111950],
  60: [71280, 81420, 91620, 101760, 109920, 118080, 126240, 134340],
  70: [83160, 94990, 106890, 118720, 128240, 137760, 147280, 156730],
  80: [95040, 108560, 122160, 135680, 146560, 157440, 168320, 179120],
  90: [106920, 122130, 137430, 152640, 164880, 177120, 189360, 201510],
  100: [118800, 135700, 152700, 169600, 183200, 196800, 210400, 223900],
  110: [130680, 149270, 167970, 186560, 201520, 216480, 231440, 246290],
  120: [142560, 162840, 183240, 203520, 219840, 236160, 252480, 268680],
  130: [154440, 176410, 198510, 220480, 238160, 255840, 273520, 291070],
  165: [196020, 223905, 251955, 279840, 302280, 324720, 347160, 369435],
  175: [207900, 237475, 267225, 296800, 320600, 344400, 368200, 391825],
};

/** Max income for an AMI % and household size, or null if not in the table. */
export function amiMaxIncome(amiPercent: number, householdSize: number): number | null {
  const row = AMI_TABLE[amiPercent];
  if (!row || householdSize < 1 || householdSize > row.length) return null;
  return row[householdSize - 1];
}

/** Household's income as a % of 100% AMI for its size (rounded), or null for sizes > 8. */
export function householdAmiPercent(annualIncome: number, householdSize: number): number | null {
  const base = amiMaxIncome(100, householdSize);
  if (base == null) return null;
  return Math.round((annualIncome / base) * 100);
}
