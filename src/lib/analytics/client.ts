import type { Lang } from "@/lib/i18n";
import { COUNT_BUCKETS, MAX_BODY_BYTES, SOURCES } from "./schema-constants";

/**
 * Browser-side anonymous event tracking (HN-001 PR 1b).
 *
 * - Off unless NEXT_PUBLIC_ANALYTICS_ENABLED === "true" (inlined at build). When off, nothing is
 *   sent and sessionStorage / BroadcastChannel are never touched.
 * - Never throws and never blocks the UI: every failure is swallowed.
 * - Only the allow-listed fields below are ever sent; callers choose an event name and its
 *   typed, enumerated props — no free text, matcher inputs, emails or IPs can pass through.
 * - Delivery is `fetch` with `referrerPolicy: "no-referrer"` and `credentials: "omit"`, so the
 *   request carries no Referer (which would otherwise contain the page's full URL incl. query
 *   string) and no cookies. `sendBeacon` is deliberately NOT used: it can't control Referer.
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

const SESSION_KEY = "hn_sid";
const SOURCE_KEY = "hn_src";
const ONCE_PREFIX = "hn_once:";
const CHANNEL = "hn_session";
const PATH_RE = /^\/[A-Za-z0-9/_-]{0,199}$/;
const LISTING_ID_RE = /^[A-Za-z0-9_-]{1,64}$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** How long a new document waits for another live tab to claim the copied session id. */
export const SESSION_PROBE_MS = 150;

export function analyticsEnabled(): boolean {
  return process.env.NEXT_PUBLIC_ANALYTICS_ENABLED === "true";
}

export function bucket(n: number): Bucket {
  if (!Number.isFinite(n) || n <= 0) return "0";
  if (n <= 5) return "1-5";
  if (n <= 20) return "6-20";
  return "20+";
}

function storage(): Storage | null {
  try {
    const s = window.sessionStorage;
    s.getItem(SESSION_KEY); // may throw in some privacy modes
    return s;
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------------------------------
 * Per-tab session
 *
 * sessionStorage alone is not per-tab: browsers copy it into tabs opened from this one
 * (window.open / target=_blank links, with or without noopener in Chromium) and into tabs made
 * with "Duplicate tab". To keep one session per tab:
 *   1. A new document reads hn_sid and asks other live same-origin tabs over a
 *      BroadcastChannel whether they own it ("probe").
 *   2. A tab that has already resolved that id answers "claimed". If anyone claims it, this
 *      tab is a copy → it rotates to a fresh id.
 *   3. A same-tab reload or navigation has no live owner (the old document is gone or frozen),
 *      so it keeps its id.
 * "Once" markers are keyed by session id (hn_once:<sid>:<name>), so rotating the id resets them
 * without clearing anything else; stale markers from a copied session are pruned by prefix.
 * Limits: without BroadcastChannel, or if the original tab was closed before the copy loads,
 * the copy keeps the inherited id (documented in docs/HN-001_PR1b.md).
 * ---------------------------------------------------------------------------------------- */

let sessionPromise: Promise<string> | null = null;
let ownedSid: string | null = null;
let channel: BroadcastChannel | null = null;
let memorySid: string | null = null; // fallback when sessionStorage is blocked
const memoryOnce = new Set<string>();

function openChannel(): BroadcastChannel | null {
  if (channel) return channel;
  try {
    if (typeof BroadcastChannel !== "function") return null;
    channel = new BroadcastChannel(CHANNEL);
    channel.addEventListener("message", (e: MessageEvent) => {
      const d = e.data as { type?: string; sid?: string } | null;
      if (d?.type === "probe" && ownedSid && d.sid === ownedSid) {
        try {
          channel?.postMessage({ type: "claimed", sid: ownedSid });
        } catch {}
      }
    });
    return channel;
  } catch {
    return null;
  }
}

function isClaimedElsewhere(sid: string): Promise<boolean> {
  const ch = openChannel();
  if (!ch) return Promise.resolve(false);
  return new Promise((resolve) => {
    let done = false;
    const finish = (v: boolean) => {
      if (done) return;
      done = true;
      ch.removeEventListener("message", onMsg);
      resolve(v);
    };
    const onMsg = (e: MessageEvent) => {
      const d = e.data as { type?: string; sid?: string } | null;
      if (d?.type === "claimed" && d.sid === sid) finish(true);
    };
    ch.addEventListener("message", onMsg);
    try {
      ch.postMessage({ type: "probe", sid });
    } catch {
      finish(false);
    }
    setTimeout(() => finish(false), SESSION_PROBE_MS);
  });
}

function pruneOnceMarkers(s: Storage | null, sid: string) {
  if (!s) return;
  try {
    const keep = `${ONCE_PREFIX}${sid}:`;
    const stale: string[] = [];
    for (let i = 0; i < s.length; i++) {
      const k = s.key(i);
      if (k && k.startsWith(ONCE_PREFIX) && !k.startsWith(keep)) stale.push(k);
    }
    stale.forEach((k) => s.removeItem(k));
  } catch {}
}

function freshSid(s: Storage | null): string {
  const id = crypto.randomUUID();
  try {
    s?.setItem(SESSION_KEY, id);
  } catch {}
  memorySid = id;
  return id;
}

/** Resolves this tab's session id (rotating it if this tab is a copy). Memoized per document. */
export function resolveSession(): Promise<string> {
  if (sessionPromise) return sessionPromise;
  sessionPromise = (async () => {
    const s = storage();
    let stored: string | null = null;
    try {
      stored = s?.getItem(SESSION_KEY) ?? memorySid;
    } catch {
      stored = memorySid;
    }
    let sid: string;
    if (stored && UUID_RE.test(stored)) {
      sid = (await isClaimedElsewhere(stored)) ? freshSid(s) : stored;
    } else {
      sid = freshSid(s);
    }
    memorySid = sid;
    pruneOnceMarkers(s, sid);
    ownedSid = sid;
    openChannel(); // keep listening so later copies of this tab get rotated
    return sid;
  })();
  return sessionPromise;
}

/** True the first time `name` is marked in this tab session. */
function markOnce(sid: string, name: string): boolean {
  const k = `${ONCE_PREFIX}${sid}:${name}`;
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

/**
 * Attribution channel, remembered for the tab session.
 * Precedence: utm_source (on our own links) wins over the referrer host; neither → "direct".
 * Same-host referrers are ignored. Values outside the allow-list map to "other".
 */
export function detectSource(): Source {
  const s = storage();
  try {
    const saved = s?.getItem(SOURCE_KEY);
    if (saved && (SOURCES as readonly string[]).includes(saved)) return saved as Source;
  } catch {}
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
    void fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true, // survives navigation, like a beacon
      referrerPolicy: "no-referrer", // never send the page URL (or its query string)
      credentials: "omit", // no cookies needed
      cache: "no-store",
    }).catch(() => {});
  } catch {}
}

async function emit<N extends EventName>(name: N, props: EventProps[N], lang: Lang, once: boolean) {
  try {
    if (typeof window === "undefined" || !propsValid(name, props)) return;
    // Capture page context synchronously, before the async session check.
    const path = currentPath();
    const source = detectSource();
    const sid = await resolveSession();
    if (once && !markOnce(sid, name)) return;
    const event = {
      event_id: crypto.randomUUID(),
      session_id: sid,
      event_name: name,
      path,
      lang: lang === "zh" ? "zh" : "en",
      source,
      props,
    };
    send(JSON.stringify({ events: [event] }));
  } catch {}
}

/** Fire-and-forget. Safe to call from any event handler. */
export function track<N extends EventName>(name: N, props: EventProps[N], lang: Lang): void {
  if (!analyticsEnabled()) return;
  void emit(name, props, lang, false);
}

/** Like track(), but sends at most once per tab session for this event name. */
export function trackOncePerSession<N extends EventName>(name: N, props: EventProps[N], lang: Lang): void {
  if (!analyticsEnabled()) return;
  void emit(name, props, lang, true);
}

/** Test helper: resets per-document state. */
export function __resetAnalyticsMemory() {
  sessionPromise = null;
  ownedSid = null;
  memorySid = null;
  memoryOnce.clear();
  try {
    channel?.close();
  } catch {}
  channel = null;
}
