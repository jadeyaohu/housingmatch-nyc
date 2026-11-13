import { boroughLabel } from "../i18n";
import type { Listing } from "../types";
import { availabilityOf, listingTypeOf } from "../availability";
import { lifecycle, parseUnitTypes } from "../import/normalize";
export function directoryParams(input: Record<string,string|string[]|undefined>): Record<string,string|undefined> {
  return Object.fromEntries(["q","borough","unit","type","status"].map(k=>[k,typeof input[k] === "string" ? input[k].slice(0,k==="q"?120:50) : undefined]));
}
export function directoryListings(all: Listing[], sp: Record<string, string | undefined>, today: string) {
  const unit = sp.unit ? parseUnitTypes(sp.unit)[0] : undefined;
  const type = ["rerental", "waitlist"].includes(sp.type ?? "") ? sp.type : "lottery";
  const q = (sp.q ?? "").trim().slice(0,120).toLocaleLowerCase();
  return all.filter(l => listingTypeOf(l) === type && availabilityOf(l,today) !== "confirmed_closed" &&
    (!sp.borough || l.borough === sp.borough) && (!unit || l.unitTypes.includes(unit)) &&
    (!sp.status || lifecycle(l,today) === sp.status) && (!q || `${l.projectName} ${l.address ?? ""} ${l.borough ?? ""} ${l.borough ? boroughLabel.zh[l.borough] : ""}`.toLocaleLowerCase().includes(q)))
    .sort((a,b) => (a.applicationDeadline ?? "9999").localeCompare(b.applicationDeadline ?? "9999") || a.projectName.localeCompare(b.projectName));
}
export function safeProviderURL(raw: string | null): string | null {
  try { const u = new URL(raw ?? ""); return u.protocol === "https:" && !u.username && !u.password ? u.href : null; } catch { return null; }
}
