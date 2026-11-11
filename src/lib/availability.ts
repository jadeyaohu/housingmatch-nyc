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

export function availabilityOf(l: Listing, today: string): Availability {
  if (l.status === "closed") return "confirmed_closed";
  if (l.applicationDeadline && l.applicationDeadline < today) return "confirmed_closed";

  const type = l.listingType ?? "lottery";
  if (type === "lottery") {
    // Official lotteries: a published, future deadline is the verification.
    if (l.applicationDeadline && (l.status === "open" || l.status === "unknown")) return "verified_open";
    if (l.status === "upcoming") return "unverified";
    return "unverified";
  }

  // A waiting-list lottery on Housing Connect has an official deadline, like any lottery.
  if (type === "waitlist" && (l.dataSource ?? "opendata") === "opendata" && l.applicationDeadline && l.status === "open") return "verified_waitlist";

  // Re-rentals and waiting lists: only as fresh as the last time someone saw them listed.
  const seen = l.collectedAt ?? l.lastVerifiedAt;
  const fresh = seen != null && Date.parse(today) - Date.parse(seen.slice(0, 10)) <= REVERIFY_DAYS * DAY;
  if (!fresh) return "unverified";
  return type === "waitlist" ? "verified_waitlist" : "verified_open";
}

export const isSecondary = (l: Listing) => (l.listingType ?? "lottery") !== "lottery";
