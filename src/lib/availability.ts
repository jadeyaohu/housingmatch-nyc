// Whether a listing is actually accepting applications right now, as far as we can verify.
//
// Separate from eligibility and from the stored `status`. A missing deadline never makes a
// listing "open" by itself: re-rentals and waiting lists count as verified only when a collector
// saw them listed as available recently.

import type { Listing } from "./types";

export type Availability =
  | "verified_open" // official deadline in the future, or seen as available on its source recently
  | "verified_waitlist" // an open waiting list, seen recently on its source
  | "unverified" // we can't confirm it's still accepting applications
  | "confirmed_closed"; // deadline passed or source says closed

/** How recently a collector must have seen a re-rental / waiting list to call it verified. */
export const REVERIFY_DAYS = 7;

const DAY = 86_400_000;
const NYC_DATE = new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" });

function calendarDay(value: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const day = Date.parse(value);
  return Number.isFinite(day) && new Date(day).toISOString().slice(0, 10) === value ? day : null;
}

function observationDay(value: string): number | null {
  if (value.length === 10) return calendarDay(value);
  if (calendarDay(value.slice(0, 10)) == null) return null;
  const instant = Date.parse(value);
  return Number.isFinite(instant) ? calendarDay(NYC_DATE.format(new Date(instant))) : null;
}

/** Legacy Supabase rows retain is_rerental even when listingType is missing. */
export const listingTypeOf = (l: Listing) => l.listingType ?? (l.isRerental ? "rerental" : "lottery");

export function availabilityOf(l: Listing, today: string): Availability {
  if (l.status === "closed") return "confirmed_closed";
  if (l.applicationDeadline && l.applicationDeadline < today) return "confirmed_closed";

  if (l.status === "upcoming" || (l.applicationOpenDate && l.applicationOpenDate > today)) return "unverified";

  const type = listingTypeOf(l);
  if (type === "lottery") {
    // Official lotteries: a published, future deadline is the verification.
    if (l.applicationDeadline && (l.status === "open" || l.status === "unknown")) return "verified_open";
    return "unverified";
  }

  // A collection timestamp alone is not evidence that applications were open.
  if (l.status !== "open") return "unverified";

  // A waiting-list lottery on Housing Connect has an official deadline, like any lottery.
  if (type === "waitlist" && l.dataSource === "opendata" && l.applicationDeadline) return "verified_waitlist";

  // Re-rentals and waiting lists: only as fresh as the last time someone saw them listed.
  const seen = l.collectedAt ?? l.lastVerifiedAt;
  const day = seen != null ? observationDay(seen) : null;
  const age = day != null ? Date.parse(today) - day : NaN;
  const fresh = age >= 0 && age <= REVERIFY_DAYS * DAY;
  if (!fresh) return "unverified";
  return type === "waitlist" ? "verified_waitlist" : "verified_open";
}

export const isSecondary = (l: Listing) => listingTypeOf(l) !== "lottery";
