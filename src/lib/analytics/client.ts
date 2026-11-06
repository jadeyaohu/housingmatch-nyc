import type { Lang } from "@/lib/i18n";
import { COUNT_BUCKETS, MAX_BODY_BYTES, SOURCES } from "./schema-constants";

/**
 * Browser-side anonymous event tracking (HN-001 PR 1b).
 *
 * - Off unless NEXT_PUBLIC_ANALYTICS_ENABLED === "true" (inlined at build). When off, nothing is
 *   sent and sessionStorage is never touched.
 * - Never throws and never blocks the UI: every failure is swallowed.
 * - Only the allow-listed fields below are ever sent. There is no way to pass free text,
 *   matcher inputs, emails or IPs through this API — callers can only choose an event name and
 *   its typed, enumerated props.
 * - The server (/api/events) is controlled independently by ANALYTICS_INGEST_ENABLED and
 *   re-validates everything.
 */

type Bucket = (typeof COUNT_BUCKETS)[number];
type Source = (typeof SOURCES)[number];
export type EventProps = {
  page_view: Record<string, never>;
  matcher_started: Record<string, never>;
  matcher_completed: { likely_count: Bucket; review_count: Bucket; has_borough_pref: boolean };
  listing_details_opened: { listing_id: string };
  application_link_clicked: { listing_id: string; from: "results" | "listings" };
};
export type EventName = keyof EventProps;

const SESSION_KEY = "hn_sid";
const SOURCE_KEY = "hn_src";
const ONCE_PREFIX = "hn_once:";
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

let memorySession: string | null = null; // fallback when sessionStorage is blocked
const memoryOnce = new Set<string>();

function storage(): Storage | null {
  try {
    const s = window.sessionStorage;
    s.getItem(SESSION_KEY); // may throw in some privacy modes
    return s;
  } catch {
    return null;
  }
}

/** Random per-tab-session id. Not a cookie, not persistent, not linked to anything else. */
export function sessionId(): string {
  const s = storage();
  let id = s?.getItem(SESSION_KEY) ?? memorySession;
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
    id = crypto.randomUUID();
    try {
      s?.setItem(SESSION_KEY, id);
    } catch {}
    memorySession = id;
  }
  return id;
}

/** True the first time `key` is seen in this tab session, false afterwards. */
export function firstInSession(key: string): boolean {
  if (!analyticsEnabled()) return false; // tracking off → never touch storage
  const k = ONCE_PREFIX + key;
  const s = storage();
  if (s) {
    try {
      if (s.getItem(k)) return false;
      s.setItem(k, "1");
      return true;
    } catch {}
  }
  if (memoryOnce.has(k)) return false;
  memoryOnce.add(k);
  return true;
}

/** Maps utm_source / referrer host to an allow-listed channel. Remembered for the tab session. */
export function detectSource(): Source {
  const s = storage();
  const saved = s?.getItem(SOURCE_KEY);
  if (saved && (SOURCES as readonly string[]).includes(saved)) return saved as Source;
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
  try {
    s?.setItem(SOURCE_KEY, src);
  } catch {}
  return src;
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
    if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
      if (navigator.sendBeacon("/api/events", new Blob([body], { type: "application/json" }))) return;
    }
  } catch {}
  try {
    void fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
      credentials: "same-origin",
    }).catch(() => {});
  } catch {}
}

/** Fire-and-forget. Safe to call from any event handler. */
export function track<N extends EventName>(name: N, props: EventProps[N], lang: Lang): void {
  if (!analyticsEnabled()) return;
  try {
    if (typeof window === "undefined" || !propsValid(name, props)) return;
    const event = {
      event_id: crypto.randomUUID(),
      session_id: sessionId(),
      event_name: name,
      path: currentPath(),
      lang: lang === "zh" ? "zh" : "en",
      source: detectSource(),
      props,
    };
    send(JSON.stringify({ events: [event] }));
  } catch {}
}

/** Test helper: resets in-memory fallbacks. */
export function __resetAnalyticsMemory() {
  memorySession = null;
  memoryOnce.clear();
}
