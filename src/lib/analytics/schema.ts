import { z } from "zod";

/**
 * Strict allow-list for anonymous analytics events (HN-001).
 * Every event object and every `props` object is `.strict()`: any key not listed
 * here (e.g. income, household size, voucher, disability, email) rejects the request.
 */

import { COUNT_BUCKETS, MAX_BODY_BYTES, MAX_EVENTS_PER_REQUEST, SOURCES } from "./schema-constants";
export { COUNT_BUCKETS, MAX_BODY_BYTES, MAX_EVENTS_PER_REQUEST, SOURCES };

const base = {
  event_id: z.uuid(),
  session_id: z.uuid(),
  path: z.string().regex(/^\/[A-Za-z0-9/_-]{0,199}$/, "pathname only"),
  lang: z.enum(["en", "zh"]),
  source: z.enum(SOURCES).optional(),
};

const listingId = z.string().regex(/^[A-Za-z0-9_-]{1,64}$/);
const empty = z.object({}).strict().default({});

export const EventSchema = z.discriminatedUnion("event_name", [
  z.object({ ...base, event_name: z.literal("page_view"), props: empty }).strict(),
  z.object({ ...base, event_name: z.literal("matcher_started"), props: empty }).strict(),
  z
    .object({
      ...base,
      event_name: z.literal("matcher_completed"),
      props: z
        .object({
          likely_count: z.enum(COUNT_BUCKETS),
          review_count: z.enum(COUNT_BUCKETS),
          has_borough_pref: z.boolean(),
        })
        .strict(),
    })
    .strict(),
  z
    .object({ ...base, event_name: z.literal("listing_details_opened"), props: z.object({ listing_id: listingId }).strict() })
    .strict(),
  z
    .object({
      ...base,
      event_name: z.literal("application_link_clicked"),
      props: z.object({ listing_id: listingId, from: z.enum(["results", "listings"]) }).strict(),
    })
    .strict(),
]);

export const EventBatchSchema = z
  .object({ events: z.array(EventSchema).min(1).max(MAX_EVENTS_PER_REQUEST) })
  .strict();

export type AnalyticsEvent = z.infer<typeof EventSchema>;

/** Row shape written to public.analytics_events (occurred_at is set by the database). */
export type EventRow = Omit<AnalyticsEvent, "source"> & { source: (typeof SOURCES)[number] | null };

export function toRow(e: AnalyticsEvent): EventRow {
  return { ...e, source: e.source ?? null };
}
