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
 * - Delivery is `fetch` with `referrerPolicy: "no-referrer"`, so the request carries no Referer
 *   (which would otherwise contain the page's full URL incl. query string), and
 *   `credentials: "same-origin"` so cookie-protected deployments (Vercel Authentication on
 *   Previews) accept it. `sendBeacon` is deliberately NOT used: it can't control Referer.
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
 * (window.open / target=_blank) and into "Duplicate tab" copies. Protocol over a
 * BroadcastChannel (all messages carry the sender's nonce):
 *
 *   probe   {sid, nonce}                 fast path: "does a live tab own sid?" (150 ms window)
 *   claimed {sid, to}                    "I own sid; you (nonce `to`) are the copy"
 *   hello   {sid, nonce, origin}         sent once after this document resolves its id
 *
 * Arbitration: when two live documents hold the same sid, the OLDER document
 * (smaller performance.timeOrigin, then smaller nonce) keeps it and the NEWER one rotates.
 * A busy owner that misses the probe window still processes the queued probe/hello later and
 * answers then → "late claim": the copy rotates and re-sends its funnel-entry events
 * (page_view, matcher_started) under the new id. Concurrent copies resolve the same way.
 * Each rotation draws a fresh random UUID, so arbitration terminates.
 *
 * A same-tab reload/navigation has no live owner; and a document gives up ownership on
 * `pagehide`, so a frozen (bfcache) page in the same tab never claims against its successor.
 * "Once" markers are keyed by session id (hn_once:<sid>:<name>), so rotation resets them;
 * stale markers are pruned by prefix — unrelated sessionStorage keys are never touched.
 * Limits (documented): no BroadcastChannel → inherited id kept; events sent by a copy before a
 * late claim stay attributed to the shared id (raw counts may include them once).
 * ---------------------------------------------------------------------------------------- */

type Msg =
  | { type: "probe"; sid: string; nonce: string }
  | { type: "claimed"; sid: string; to: string }
  | { type: "hello"; sid: string; nonce: string; origin: number };

let sessionPromise: Promise<string> | null = null;
let ownedSid: string | null = null; // the sid this document currently owns (null while hidden)
let liveSid: string | null = null; // the sid this document is using
let channel: BroadcastChannel | null = null;
let memorySid: string | null = null; // fallback when sessionStorage is blocked
const memoryOnce = new Set<string>();
let docNonce: string | null = null;
const replayable: { name: "page_view" | "matcher_started"; props: Record<string, never>; lang: Lang; path: string; source: Source }[] = [];

function nonce(): string {
  return (docNonce ??= crypto.randomUUID());
}
function origin(): number {
  try {
    return performance.timeOrigin || 0;
  } catch {
    return 0;
  }
}
/** True if the peer (origin, nonce) is older than this document. */
function peerIsOlder(peerOrigin: number, peerNonce: string): boolean {
  const mine = origin();
  if (peerOrigin !== mine) return peerOrigin < mine;
  return peerNonce < nonce();
}

function post(m: Msg) {
  try {
    channel?.postMessage(m);
  } catch {}
}

function onMessage(e: MessageEvent) {
  const d = e.data as Msg | null;
  if (!d || typeof d !== "object" || !ownedSid || d.sid !== ownedSid) return;
  if (d.type === "probe" && d.nonce !== nonce()) {
    post({ type: "claimed", sid: ownedSid, to: d.nonce });
  } else if (d.type === "hello" && d.nonce !== nonce()) {
    if (peerIsOlder(d.origin, d.nonce)) rotateLate();
    else post({ type: "claimed", sid: ownedSid, to: d.nonce });
  } else if (d.type === "claimed" && d.to === nonce()) {
    rotateLate();
  }
}

function openChannel(): BroadcastChannel | null {
  if (channel) return channel;
  try {
    if (typeof BroadcastChannel !== "function") return null;
    channel = new BroadcastChannel(CHANNEL);
    channel.addEventListener("message", onMessage);
    window.addEventListener("pagehide", () => {
      ownedSid = null; // a hidden/frozen document never claims against its successor
    });
    window.addEventListener("pageshow", (ev) => {
      if ((ev as PageTransitionEvent).persisted && liveSid) ownedSid = liveSid; // restored from bfcache
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
      ch.removeEventListener("message", onProbeReply);
      resolve(v);
    };
    const onProbeReply = (e: MessageEvent) => {
      const d = e.data as Msg | null;
      if (d?.type === "claimed" && d.sid === sid && d.to === nonce()) finish(true);
    };
    ch.addEventListener("message", onProbeReply);
    post({ type: "probe", sid, nonce: nonce() });
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

function adopt(sid: string) {
  const s = storage();
  memorySid = sid;
  pruneOnceMarkers(s, sid);
  liveSid = sid;
  ownedSid = sid;
  sessionPromise = Promise.resolve(sid);
  post({ type: "hello", sid, nonce: nonce(), origin: origin() });
}

/** Late claim: another live, older document owns our id → take a fresh one and re-send entry events. */
function rotateLate() {
  const old = liveSid;
  const sid = freshSid(storage());
  adopt(sid);
  if (!old) return;
  const entries = replayable.splice(0);
  for (const r of entries) {
    if (r.name === "matcher_started" && !markOnce(sid, r.name)) continue;
    sendEvent(sid, r.name, r.props, r.lang, r.path, r.source);
    replayable.push(r);
  }
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
    openChannel(); // listen from the start so late claims are never missed
    const sid = stored && UUID_RE.test(stored) && !(await isClaimedElsewhere(stored)) ? stored : freshSid(s);
    adopt(sid);
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
      // Same-origin cookies are required on cookie-protected deployments (e.g. Vercel
      // Authentication on Previews). The route never reads cookies, and the payload never
      // contains tokens or identifiers beyond the random session id.
      credentials: "same-origin",
      cache: "no-store",
    }).catch(() => {});
  } catch {}
}

function sendEvent(sid: string, name: EventName, props: unknown, lang: Lang, path: string, source: Source) {
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
}

async function emit<N extends EventName>(name: N, props: EventProps[N], lang: Lang, once: boolean) {
  try {
    if (typeof window === "undefined" || !propsValid(name, props)) return;
    // Capture page context synchronously, before the async session check.
    const path = currentPath();
    const source = detectSource();
    const sid = await resolveSession();
    if (name === "page_view" || name === "matcher_started") {
      // Funnel-entry events are remembered so a late session rotation can re-send them.
      if (!replayable.some((r) => r.name === name)) replayable.push({ name, props: {}, lang, path, source });
    }
    if (once && !markOnce(sid, name)) return;
    sendEvent(sid, name, props, lang, path, source);
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
  liveSid = null;
  memorySid = null;
  docNonce = null;
  memoryOnce.clear();
  replayable.length = 0;
  try {
    channel?.close();
  } catch {}
  channel = null;
}
