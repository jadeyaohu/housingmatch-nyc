"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { Lang } from "@/lib/i18n";
import { chatCopy } from "@/lib/chat/content";
import { chatInput } from "@/lib/subscriptions/model";
import { trackEvent } from "@/lib/analytics/events";
type Usage = { used: number; limit: number; plan: "free" | "basic" | "smart" };
export function Chatbot({ lang, enabled }: { lang: Lang; enabled: boolean }) {
  const t = chatCopy[lang];
  const [question, setQuestion] = useState("");
  const [consent, setConsent] = useState(false);
  const [pending, setPending] = useState(false);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [error, setError] = useState("");
  const [messages, setMessages] = useState<{ question: string; answer: string; source: "faq" | "gemini" }[]>([]);
  useEffect(() => {
    if (enabled) void fetch("/api/subscriptions/status", { credentials: "same-origin", referrerPolicy: "no-referrer" }).then(r => r.ok ? r.json() : null).then(setUsage).catch(() => {});
  }, [enabled]);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); if (pending || !consent) return;
    const input = chatInput.safeParse({ question, requestId: crypto.randomUUID(), consent });
    if (!input.success) { setError(t.invalid); return; }
    setPending(true); setError("");
    try {
      const res = await fetch("/api/chat", { method: "POST", credentials: "same-origin", referrerPolicy: "no-referrer", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input.data) });
      const data = await res.json();
      if (!res.ok) { setError(data.error === "quota" ? t.quota : res.status === 401 ? t.login : res.status === 409 ? t.busy : data.error === "invalid_input" ? t.invalid : t.error); return; }
      setMessages(old => [...old.slice(-14), { question: input.data.question, answer: data.answer, source: data.source }]);
      setQuestion(""); setUsage(data.usage);
      trackEvent({ event: "chatbot_message", language: lang, plan: data.usage.plan });
    } catch { setError(t.error); } finally { setPending(false); }
  }
  return <div className="mx-auto max-w-3xl">
    <h1 className="text-3xl font-bold sm:text-5xl">{t.title}</h1><p className="mt-4 text-stone-600">{t.sub}</p>
    <aside className="my-6 rounded-2xl bg-amber-50 p-5 text-sm leading-relaxed text-amber-950">{t.notice}</aside>
    {!enabled && <p role="status" className="my-5 rounded-xl border p-4">{t.unavailable}</p>}
    {usage && <p className="mb-4 font-semibold">{t.usage}: {usage.used}/{usage.limit} · {t.reset}</p>}
    <div aria-live="polite" aria-busy={pending} className="space-y-4">{messages.map((m, i) => <article key={i} className="break-words rounded-2xl border bg-white p-5"><p className="font-semibold">{m.question}</p><p className="mt-3 whitespace-pre-wrap">{m.answer}</p><p className="mt-3 text-xs text-teal-800">{t[m.source]}</p></article>)}</div>
    <form onSubmit={submit} className="mt-6 space-y-4">
      <label className="block font-semibold">{t.label}<textarea value={question} onChange={e=>setQuestion(e.target.value)} maxLength={1000} required disabled={!enabled || pending} rows={4} className="mt-2 block w-full rounded-xl border border-stone-300 bg-white p-3 font-normal disabled:opacity-60" /></label>
      <label className="flex items-start gap-3 text-sm"><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)} disabled={!enabled || pending} className="mt-1 size-4 shrink-0"/><span>{t.consent}</span></label>
      <button disabled={!enabled || !consent || pending} className="min-h-12 rounded-xl bg-teal-800 px-6 font-semibold text-white disabled:opacity-50">{pending ? t.pending : t.send}</button>
      {error && <p role="alert" className="rounded-xl bg-amber-50 p-4 text-amber-950">{error}</p>}
    </form>
    <div className="mt-6 flex flex-wrap gap-5 text-teal-800 underline"><Link href="/pricing">{t.pricing}</Link><Link href="/signup?next=%2Fchat">{t.login}</Link><Link href="/consultation">{lang === "zh" ? "预约一对一咨询" : "Book a Consultation"}</Link></div>
    <p className="mt-6 text-xs leading-relaxed text-stone-500">{t.demo}</p>
  </div>;
}
