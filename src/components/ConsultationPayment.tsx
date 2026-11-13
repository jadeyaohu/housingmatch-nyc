"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Lang } from "@/lib/i18n";
import { paymentCopy } from "@/lib/payments/content";

type State = "issued" | "creating" | "pending" | "paid" | "expired" | "failed" | "refunded";
type Status = { state: State; package: "standard" | "expert"; amount: number; currency: "usd"; bookingStatus: string; refundStatus?: string | null };
export function ConsultationPayment({ lang, returned = false, cancelled = false }: { lang: Lang; returned?: boolean; cancelled?: boolean }) {
  const t = paymentCopy[lang];
  const token = useRef<string | null>(null);
  const attemptId = useRef<string | null>(null);
  const [result, setResult] = useState<Status | null>(null);
  const [error, setError] = useState(false);
  const [checkoutError, setCheckoutError] = useState(false);
  const [busy, setBusy] = useState(false);
  const refreshing = useRef(false);
  const authorization = useCallback((): Record<string, string> => ({ ...(token.current ? { Authorization: `Bearer ${token.current}` } : {}), ...(attemptId.current ? { "X-Consultation-Attempt": attemptId.current } : {}) }), []);
  const refresh = useCallback(async () => {
    if (refreshing.current) return;
    refreshing.current = true;
    try {
      const response = await fetch("/api/consultation/payments/status", { method: "POST", headers: authorization(), credentials: "same-origin", referrerPolicy: "no-referrer", cache: "no-store" });
      if (!response.ok) throw new Error("unavailable");
      const data = await response.json();
      if (!["issued", "creating", "pending", "paid", "expired", "failed", "refunded"].includes(data.state) || !["standard", "expert"].includes(data.package) || data.currency !== "usd" || data.amount !== (data.package === "standard" ? 5900 : 9900)) throw new Error("invalid_status");
      if (typeof data.attemptId === "string" && /^[0-9a-f-]{36}$/.test(data.attemptId)) {
        attemptId.current = data.attemptId;
        history.replaceState(null, "", `${location.pathname}?attempt=${data.attemptId}`);
      }
      setResult(data); setError(false);
    } catch { setError(true); }
    finally { refreshing.current = false; }
  }, [authorization]);
  useEffect(() => {
    const selector = new URLSearchParams(location.search).get("attempt");
    if (selector && /^[0-9a-f-]{36}$/.test(selector)) attemptId.current = selector;
    const params = new URLSearchParams(location.hash.slice(1));
    const fragmentToken = params.get("token");
    if (fragmentToken) token.current = fragmentToken;
    // Capability stays in memory/HttpOnly cookie: never query strings, localStorage or analytics.
    history.replaceState(null, "", location.pathname + (attemptId.current ? `?attempt=${attemptId.current}` : ""));
    void refresh();
  }, [refresh]);
  const paymentState = result?.state;
  const refundState = result?.refundStatus;
  useEffect(() => {
    if (!returned || !(["creating", "pending"].includes(paymentState ?? "") || ["preparing", "pending"].includes(refundState ?? ""))) return;
    let count = 0;
    const timer = setInterval(() => { if (++count > 20) clearInterval(timer); else void refresh(); }, 3000);
    return () => clearInterval(timer);
  }, [returned, paymentState, refundState, refresh]);
  async function pay() {
    if (busy) return; setBusy(true); setCheckoutError(false);
    try {
      const response = await fetch("/api/consultation/payments/checkout", { method: "POST", headers: authorization(), credentials: "same-origin", referrerPolicy: "no-referrer" });
      if (!response.ok) throw new Error("unavailable");
      const { url } = await response.json();
      if (new URL(url).origin !== "https://checkout.stripe.com") throw new Error("unsafe_redirect");
      location.assign(url);
    } catch { setCheckoutError(true); setBusy(false); }
  }
  return <div className="mx-auto max-w-2xl">
    <p className="text-xs font-bold tracking-widest text-teal-800">{t.badge}</p>
    <h1 className="mt-4 text-3xl font-bold sm:text-4xl">{t.title}</h1><p className="mt-4 leading-relaxed text-stone-600">{t.intro}</p>
    {returned && <p className="mt-5 rounded-xl bg-stone-100 p-4 text-sm">{cancelled ? t.cancelled : t.closed}</p>}
    <section className="mt-7 rounded-3xl border border-stone-200 bg-white p-6 sm:p-8" aria-live="polite">
      {error ? <p role="alert" className="text-red-900">{t.error}</p> : !result ? <p>{t.loading}</p> : <>
        <p className="text-lg font-semibold">{t[result.package]}</p><p className="mt-3 text-4xl font-bold">${result.amount / 100} <span className="text-base text-stone-500">USD</span></p>
        <h2 className="mt-6 text-xl font-semibold">{t[result.state]}</h2>
        <p className="mt-3 leading-relaxed">{result.state === "paid" ? t.receipt : result.state === "refunded" ? t.refunded : t.unpaid}</p>
        {result.refundStatus && ["preparing", "pending", "failed"].includes(result.refundStatus) && <p className="mt-3 text-amber-900">{result.refundStatus === "failed" ? t.refundFailed : t.refundPending}</p>}
        <p className="mt-3 font-semibold">{result.bookingStatus === "confirmed" ? t.confirmed : result.bookingStatus === "completed" ? t.bookingCompleted : result.bookingStatus === "cancelled" ? t.bookingCancelled : t.notConfirmed}</p>
        {["issued", "creating", "pending"].includes(result.state) && <button onClick={pay} disabled={busy} className="mt-6 w-full rounded-xl bg-teal-800 px-4 py-3 font-semibold text-white disabled:opacity-50">{busy ? t.creating : t.pay}</button>}
      </>}
      {checkoutError && <p role="alert" className="mt-4 text-red-900">{t.retry}</p>}
      <button onClick={() => void refresh()} className="mt-5 font-semibold text-teal-800 underline">{t.refresh}</button>
    </section>
    <p className="mt-5 rounded-xl bg-amber-50 p-4 text-sm text-amber-950">{t.test}</p><p className="mt-5 text-sm leading-relaxed text-stone-600">{t.separate}</p>
    <nav className="mt-6 flex flex-wrap gap-4 text-sm text-teal-800 underline"><Link href="/quiz">{t.free}</Link><Link href="/privacy">{t.privacy}</Link><Link href="/consultation/terms">{t.terms}</Link><Link href="/consultation/cancellation">{t.cancellation}</Link></nav>
  </div>;
}
