import type { Listing } from "./types";
import { availabilityOf } from "./availability";
import type { SavedItem } from "@/components/SavedList";

const CLOSING_DAYS = 7;

/** Turn saved listing ids into display rows, soonest deadline first, closed last. */
export function savedItems(ids: string[], listings: Listing[], today: string, where: (l: Listing) => string): SavedItem[] {
  const byId = new Map(listings.map((l) => [l.id, l]));
  const items = ids.map((id): SavedItem => {
    const l = byId.get(id);
    if (!l) return { id, name: "", where: "", deadline: null, daysLeft: null, state: "closed", url: null };
    const av = availabilityOf(l, today);
    const daysLeft = l.applicationDeadline ? Math.round((Date.parse(l.applicationDeadline) - Date.parse(today)) / 86_400_000) : null;
    const state: SavedItem["state"] =
      av === "confirmed_closed" ? "closed" : daysLeft != null && daysLeft <= CLOSING_DAYS ? "closing" : daysLeft != null ? "open" : "unknown";
    return { id, name: l.projectName, where: where(l), deadline: l.applicationDeadline, daysLeft: state === "closed" ? null : daysLeft, state, url: l.applicationUrl ?? l.sourceUrl };
  });
  const rank = { closing: 0, open: 1, unknown: 2, closed: 3 } as const;
  return items.sort((a, b) => rank[a.state] - rank[b.state] || (a.daysLeft ?? 1e9) - (b.daysLeft ?? 1e9));
}
