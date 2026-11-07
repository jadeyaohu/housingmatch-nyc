import type { Lang } from "@/lib/i18n";
import { COUNT_BUCKETS, MAX_BODY_BYTES, SOURCES } from "./schema-constants";

/**
 * Browser-side anonymous event tracking (HN-001 PR 1b).
 *
 * Unit of analysis: the DOCUMENT VISIT. Each document load (first load, reload, full
 * navigation, a newly opened or duplicated tab) gets one random UUID held only in memory;
 * every event sent from that document carries it as `session_id`. Client-side route changes
 * (Next.js <Link>) stay in the same document, so they keep the same id. The id is never stored,
 * never copied between tabs, and cannot link two visits together. (`session_id` keeps its name
 * for backend compatibility — it means "document-visit id", not a user, tab, or multi-page
 * session. See docs/HN-001_PR1b.md.)
 *
 * - Off unless NEXT_PUBLIC_ANALYTICS_ENABLED === "true" (inlined at build). When off, nothing is
 *   sent, nothing is generated, and no browser storage is read or written. (When on, no browser
 *   storage is used either.)
 * - Never throws and never blocks the UI: every failure is swallowed.
 * - Only the allow-listed fields below are ever sent; callers choose an event name and its
 *   typed, enumerated props — no free text, matcher inputs, emails or IPs can pass through.
 * - Delivery is `fetch` with `referrerPolicy: "no-referrer"` (no page URL / query string leaks
 *   via Referer) and `credentials: "same-origin"` (cookie-protected deployments such as Vercel
 *   Authentication on Previews accept it). `sendBeacon` is NOT used: it can't control Referer.
 * - The server (/api/events) is controlled independently by ANALYTICS_INGEST_ENABLED.
 */

type Bucket = (typeof COUNT_BUCKETS)[number];
type Source = (typeof SOURCES)[number];
export type EventProps = {
  page_view: Record<string, never>;
  matcher_started: Record<string, never>;
  /**
   * Counts are over ALL rows returned by /api/match (the full eligibility evaluation),
   * independent of the user's borough/bedroom preferences and of what the UI shows:
   *   likely_count = rows with result.status === "LIKELY_MATCH"
   *   review_count = rows with result.status === "NEEDS_REVIEW"
   * (rows with matchesPreferences === false are included). Both are bucketed.
   */
  matcher_completed: { likely_count: Bucket; review_count: Bucket; has_borough_pref: boolean };
  listing_details_opened: { listing_id: string };
  application_link_clicked: { listing_id: string; from: "results" | "listings" };
};
export type EventName = keyof EventProps;

const PATH_RE = /^\/[A-Za-z0-9/_-]{0,199}$/;
const LISTING_ID_RE = /^[A-Za-z0-9_-]{1,64}$/;

export function analyticsEnabled(): boolean {
  return process.env.NEXT_PUBLIC_ANALYTICS_ENABLED === "true";
}

export function bucket(n: number): Bucket {
  if (!Number.isFinite(n) || n <= 0) return "0";
  if (n <= 5) return "1-5";
  if (n <= 20) return "6-20";
  return "20+";
}

/* ---------- per-document state (module scope = one per document load) ---------- */
let visit: string | null = null;
let visitSource: Source | null = null;
const sentOnce = new Set<EventName>();

/** This document's visit id; created lazily on the first tracked event. */
export function visitId(): string {
  return (visit ??= crypto.randomUUID());
}

/**
 * Attribution channel for this document visit (computed once, kept in memory only).
 * Precedence: utm_source wins over the referrer host; a same-host referrer or none → "direct";
 * values outside the allow-list map to "other". A later full navigation inside the site is a new
 * visit whose referrer is our own host, so it reports "direct".
 */
export function detectSource(): Source {
  if (visitSource) return visitSource;
  let src: Source = "direct";
  try {
    const utm = new URLSearchParams(window.location.search).get("utm_source")?.toLowerCase() ?? "";
    let ref = "";
    try {
      ref = document.referrer ? new URL(document.referrer).hostname.toLowerCase() : "";
    } catch {}
    const hay = utm || (ref && ref !== window.location.hostname ? ref : "");
    if (!hay) src = "direct";
    else if (/xiaohongshu|xhslink|xhs|小红书|rednote/.test(hay)) src = "xiaohongshu";
    else if (/instagram/.test(hay)) src = "instagram";
    else if (/wechat|weixin/.test(hay)) src = "wechat";
    else if (/linkedin|lnkd/.test(hay)) src = "linkedin";
    else if (/google/.test(hay)) src = "google";
    else src = "other";
  } catch {}
  return (visitSource = src);
}

function currentPath(): string {
  try {
    const p = window.location.pathname;
    return PATH_RE.test(p) ? p : "/";
  } catch {
    return "/";
  }
}

function propsValid<N extends EventName>(name: N, props: EventProps[N]): boolean {
  if (name === "listing_details_opened" || name === "application_link_clicked") {
    return LISTING_ID_RE.test((props as { listing_id: string }).listing_id);
  }
  return true;
}

function send(body: string) {
  if (new TextEncoder().encode(body).length > MAX_BODY_BYTES) return;
  try {
    void fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true, // survives navigation, like a beacon
      referrerPolicy: "no-referrer", // never send the page URL (or its query string)
      // Same-origin cookies are required on cookie-protected deployments (e.g. Vercel
      // Authentication on Previews). The route never reads cookies, and the payload never
      // contains tokens or identifiers beyond the random visit id.
      credentials: "same-origin",
      cache: "no-store",
    }).catch(() => {});
  } catch {}
}

function emit<N extends EventName>(name: N, props: EventProps[N], lang: Lang, once: boolean) {
  try {
    if (typeof window === "undefined" || !propsValid(name, props)) return;
    if (once) {
      if (sentOnce.has(name)) return;
      sentOnce.add(name);
    }
    const event = {
      event_id: crypto.randomUUID(),
      session_id: visitId(), // = document-visit id (field name kept for backend compatibility)
      event_name: name,
      path: currentPath(),
      lang: lang === "zh" ? "zh" : "en",
      source: detectSource(),
      props,
    };
    send(JSON.stringify({ events: [event] }));
  } catch {}
}

/** Fire-and-forget. Safe to call from any event handler. */
export function track<N extends EventName>(name: N, props: EventProps[N], lang: Lang): void {
  if (!analyticsEnabled()) return;
  emit(name, props, lang, false);
}

/** Like track(), but sends at most once per document visit for this event name. */
export function trackOncePerVisit<N extends EventName>(name: N, props: EventProps[N], lang: Lang): void {
  if (!analyticsEnabled()) return;
  emit(name, props, lang, true);
}

/** Test helper: simulates a new document load. */
export function __resetAnalyticsMemory() {
  visit = null;
  visitSource = null;
  sentOnce.clear();
}
