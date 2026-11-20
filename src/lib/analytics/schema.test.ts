import { describe, expect, it } from "vitest";
import { EventBatchSchema, MAX_EVENTS_PER_REQUEST } from "./schema";

const base = {
  event_id: "0b6f0c55-1d9a-4f0e-8f43-2a6b0f3b9c11",
  session_id: "6f1c2c1e-3a0e-4c55-9d2a-7f2f8c1b9a10",
  path: "/",
  lang: "en",
};
const ok = (e: object) => EventBatchSchema.safeParse({ events: [{ ...base, ...e }] }).success;

describe("event allow-list", () => {
  it("accepts every allowed event with its allowed props", () => {
    expect(ok({ event_name: "page_view", props: {} })).toBe(true);
    expect(ok({ event_name: "page_view" })).toBe(true);
    expect(ok({ event_name: "matcher_started", props: {} })).toBe(true);
    expect(ok({ event_name: "matcher_completed", props: { likely_count: "0", review_count: "6-20", has_borough_pref: true } })).toBe(true);
    expect(ok({ event_name: "listing_details_opened", props: { listing_id: "hc-3249" } })).toBe(true);
    expect(ok({ event_name: "application_link_clicked", props: { listing_id: "hc-3249", from: "listings" } })).toBe(true);
  });

  it("rejects unknown event names", () => {
    expect(ok({ event_name: "opt_in_submitted", props: {} })).toBe(false);
    expect(ok({ event_name: "listing_viewed", props: {} })).toBe(false);
  });

  // HN-001 data-minimization guarantee: matcher household inputs can never be ingested.
  const forbidden = {
    annualIncome: 85000, annual_income: 85000, income: 85000, size: 3, household_size: 3,
    hasVoucher: true, has_voucher: true, hasDisability: true, has_disability: true,
    hasMember62Plus: true, email: "a@b.co", ip: "203.0.113.7", user_agent: "x", text: "free text",
  };
  it.each(Object.entries(forbidden))("rejects forbidden key %s in props and at the top level", (k, v) => {
    expect(ok({ event_name: "matcher_completed", props: { likely_count: "0", review_count: "0", has_borough_pref: false, [k]: v } })).toBe(false);
    expect(ok({ event_name: "page_view", props: { [k]: v } })).toBe(false);
    expect(ok({ event_name: "page_view", props: {}, [k]: v })).toBe(false);
  });

  it("rejects raw counts instead of buckets", () => {
    expect(ok({ event_name: "matcher_completed", props: { likely_count: 4, review_count: "0", has_borough_pref: false } })).toBe(false);
  });

  it("rejects query strings, full URLs and non-uuid ids", () => {
    expect(ok({ event_name: "page_view", path: "/listings?borough=Bronx" })).toBe(false);
    expect(ok({ event_name: "page_view", path: "https://x.com/" })).toBe(false);
    expect(ok({ event_name: "page_view", event_id: "123" })).toBe(false);
    expect(ok({ event_name: "page_view", session_id: "abc" })).toBe(false);
  });

  it("only allows listed sources", () => {
    expect(ok({ event_name: "page_view", source: "xiaohongshu" })).toBe(true);
    expect(ok({ event_name: "page_view", source: "some-referrer.com" })).toBe(false);
  });

  it("caps batch size", () => {
    const one = { ...base, event_name: "page_view", props: {} };
    expect(EventBatchSchema.safeParse({ events: Array(MAX_EVENTS_PER_REQUEST).fill(one) }).success).toBe(true);
    expect(EventBatchSchema.safeParse({ events: Array(MAX_EVENTS_PER_REQUEST + 1).fill(one) }).success).toBe(false);
    expect(EventBatchSchema.safeParse({ events: [] }).success).toBe(false);
    expect(EventBatchSchema.safeParse({ events: [one], extra: 1 }).success).toBe(false);
  });
});
