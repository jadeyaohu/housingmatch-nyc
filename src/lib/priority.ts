// Lottery preferences ("priority groups"): a separate dimension from eligibility and from
// lifestyle fit. A preference means a share of units is reviewed first for applicants who
// qualify. It never changes whether someone is eligible, and we never turn it into odds.
//
// Three-valued like lifestyle fit: "unknown" is never shown as "no".

import type { Listing } from "./types";
import type { Tri } from "./lifestyle";
import zipMap from "./data/zip-districts.json";

const ZIP_DISTRICTS = zipMap as Record<string, string[]>;

export interface PriorityAnswers {
  zip: string | null; // home ZIP, used only to check community-district preferences
  nycha: boolean | null; // lives in NYCHA public housing
  municipalVet: boolean | null; // NYC municipal employee or U.S. military veteran
}

export interface PriorityItem {
  kind: "community" | "nycha" | "municipal_vet";
  pct: number;
  /** yes = you appear to qualify; unknown = can't tell from what you told us; no = you said no. */
  fit: Tri;
  district?: string | null;
  /** All districts covered by a community preference. */
  districts?: string[];
}

/** Community districts a ZIP may fall in. Empty = we don't know this ZIP. */
export function districtsForZip(zip: string | null): string[] {
  if (!zip || !/^\d{5}$/.test(zip)) return [];
  return ZIP_DISTRICTS[zip] ?? [];
}

function communityFit(listingCds: string[], zip: string | null): Tri {
  if (listingCds.length === 0) return "unknown";
  const cds = districtsForZip(zip);
  if (cds.length === 0) return "unknown";
  // Only a ZIP whose every district is covered by the preference counts as a likely yes.
  if (cds.every((c) => listingCds.includes(c))) return "yes";
  if (cds.some((c) => listingCds.includes(c))) return "unknown"; // ZIP spans covered and other districts
  // Different borough entirely → clearly not covered. Same borough → can't be sure
  // (our ZIP map only covers addresses that have had lottery buildings).
  return cds.every((c) => listingCds.every((l) => c[0] !== l[0])) ? "no" : "unknown";
}

export function priorityFit(l: Listing, a: PriorityAnswers): PriorityItem[] {
  const p = l.preferences;
  if (!p) return [];
  const out: PriorityItem[] = [];
  if (p.communityPct > 0) {
    const districts = p.communityDistricts?.length ? p.communityDistricts : p.communityDistrict ? [p.communityDistrict] : [];
    out.push({ kind: "community", pct: p.communityPct, fit: communityFit(districts, a.zip), district: p.communityDistrict, districts });
  }
  const yn = (v: boolean | null): Tri => (v == null ? "unknown" : v ? "yes" : "no");
  if (p.nychaPct > 0) out.push({ kind: "nycha", pct: p.nychaPct, fit: yn(a.nycha) });
  if (p.municipalVetPct > 0) out.push({ kind: "municipal_vet", pct: p.municipalVetPct, fit: yn(a.municipalVet) });
  return out;
}

const BORO_NAME: Record<string, { en: string; zh: string }> = {
  "1": { en: "Manhattan", zh: "曼哈顿" },
  "2": { en: "Bronx", zh: "布朗克斯" },
  "3": { en: "Brooklyn", zh: "布鲁克林" },
  "4": { en: "Queens", zh: "皇后区" },
  "5": { en: "Staten Island", zh: "史泰登岛" },
};

/** Several districts: "Bronx Community Districts 2, 5 and 7" / "布朗克斯第 2、5、7 社区区". */
export function districtsLabel(cds: string[] | undefined, lang: "en" | "zh"): string | null {
  const v = (cds ?? []).filter((c) => /^[1-5]\d\d$/.test(c));
  if (v.length === 0) return null;
  if (v.length === 1) return districtLabel(v[0], lang);
  const byBoro = new Map<string, number[]>();
  for (const c of v) byBoro.set(c[0], [...(byBoro.get(c[0]) ?? []), Number(c.slice(1))]);
  const parts = [...byBoro].map(([b, ns]) => {
    const name = BORO_NAME[b][lang];
    if (lang === "zh") return `${name}第 ${ns.join("、")} 社区区`;
    const list = ns.length === 1 ? String(ns[0]) : `${ns.slice(0, -1).join(", ")} and ${ns[ns.length - 1]}`;
    return `${name} Community District${ns.length > 1 ? "s" : ""} ${list}`;
  });
  return parts.join(lang === "zh" ? "或" : " or ");
}

/** "203" → "Bronx Community District 3" / "布朗克斯第 3 社区区". */
export function districtLabel(cd: string | null | undefined, lang: "en" | "zh"): string | null {
  if (!cd || !/^[1-5]\d\d$/.test(cd)) return null;
  const b = BORO_NAME[cd[0]][lang];
  const n = Number(cd.slice(1));
  return lang === "zh" ? `${b}第 ${n} 社区区` : `${b} Community District ${n}`;
}
