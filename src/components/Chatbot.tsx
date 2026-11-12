"use client";
import { usePreview, PreviewNotice } from "./preview/PreviewProvider";
import { demoFaqAnswer } from "@/lib/chat/demo-faq";
import { PLANS, nyDay } from "@/lib/subscriptions/model";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { Lang } from "@/lib/i18n";
import { chatCopy } from "@/lib/chat/content";
import { chatInput } from "@/lib/subscriptions/model";
import { trackEvent } from "@/lib/analytics/events";
type Usage = { used: number; limit: number; plan: "free" | "basic" | "smart" };
export function Chatbot({ lang, enabled, demo=false }: { lang: Lang; enabled: boolean; demo?: boolean }) {
  const t = chatCopy[lang];
  const zh=lang==="zh";
  const preview = usePreview();
  const [question, setQuestion] = useState("");
  const [consent, setConsent] = useState(false);
  const [pending, setPending] = useState(false);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [error, setError] = useState<""|"invalid"|"login"|"quota"|"busy"|"error">("");
  const [messages, setMessages] = useState<{ question: string; answer: string; source: "faq" | "gemini" }[]>([]);
  useEffect(() => {
    if (demo) {setUsage({plan:preview.state.plan,used:preview.state.day===nyDay(new Date())?preview.state.used:0,limit:PLANS[preview.state.plan].messages});return;}
    if (enabled) void fetch("/api/subscriptions/status", { credentials: "same-origin", referrerPolicy: "no-referrer" }).then(r => r.ok ? r.json() : null).then(setUsage).catch(() => {});
  }, [enabled,demo,preview.state.plan,preview.state.used,preview.state.day]);
  const canAsk=enabled&&(demo?preview.state.signedIn:!!usage);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); if (pending || !consent) return;
    if(!canAsk){setError("login");return;}
    const input = chatInput.safeParse({ question, requestId: crypto.randomUUID(), consent });
    if (!input.success) { setError("invalid"); return; }
    if(demo){
      if(!preview.state.signedIn){setError("login");return;}
      const day=nyDay(new Date()),used=preview.state.day===day?preview.state.used:0;
      if(used>=PLANS[preview.state.plan].messages){setError("quota");return;}
      const answer=demoFaqAnswer(input.data.question,lang);
      setError("");
      preview.update(s=>({...s,day,used:used+1}));preview.record("chatbot_message",lang);
      setMessages(old=>[...old.slice(-14),{question:input.data.question,answer,source:"faq"}]);setQuestion("");return;
    }
    setPending(true); setError("");
    try {
      const res = await fetch("/api/chat", { method: "POST", credentials: "same-origin", referrerPolicy: "no-referrer", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input.data) });
      const data = await res.json();
      if (!res.ok) { setError(data.error === "quota" ? "quota" : res.status === 401 ? "login" : res.status === 409 ? "busy" : data.error === "invalid_input" ? "invalid" : "error"); return; }
      setMessages(old => [...old.slice(-14), { question: input.data.question, answer: data.answer, source: data.source }]);
      setQuestion(""); setUsage(data.usage);
      trackEvent({ event: "chatbot_message", language: lang, plan: data.usage.plan });
    } catch { setError("error"); } finally { setPending(false); }
  }
  return <div className="mx-auto max-w-3xl">
    {demo && <PreviewNotice lang={lang}/>}
    <h1 className="text-3xl font-bold sm:text-5xl">{t.title}</h1><p className="mt-4 text-stone-600">{demo?(zh?"本地 FAQ 演示，不会调用 Gemini。免费房源、AMI 工具与问卷始终开放。":"Local FAQ demo: no Gemini call. Free search, AMI tools and Quiz remain available."):t.sub}</p>
    <aside className="my-6 rounded-2xl bg-amber-50 p-5 text-sm leading-relaxed text-amber-950">{t.notice}</aside>
    {!enabled && <p role="status" className="my-5 rounded-xl border p-4">{t.unavailable}</p>}
    {usage && <p className="mb-4 font-semibold">{t.usage}: {usage.used}/{usage.limit} · {t.reset}</p>}
    <div aria-live="polite" aria-busy={pending} className="space-y-4">{messages.map((m, i) => <article key={i} className="break-words rounded-2xl border bg-white p-5"><p className="font-semibold">{m.question}</p><p className="mt-3 whitespace-pre-wrap">{m.answer}</p><p className="mt-3 text-xs text-teal-800">{t[m.source]}</p></article>)}</div>
    <form onSubmit={submit} className="mt-6 space-y-4 pb-8" data-testid="chat-composer">
      <label className="block font-semibold">{t.label}<textarea value={question} onChange={e=>setQuestion(e.target.value)} maxLength={1000} required disabled={!canAsk || pending} rows={4} className="mt-2 block w-full rounded-xl border border-stone-300 bg-white p-3 font-normal disabled:opacity-60" /></label>
      <label className="flex items-start gap-3 text-sm"><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)} disabled={!canAsk || pending} className="mt-1 size-4 shrink-0"/><span>{demo?(zh?"我了解这是本地 FAQ 演示，问题不会发送给 Google 或 Gemini；我只输入一般性非敏感问题。":"I understand this is a local FAQ demo. No question is sent to Google or Gemini; I will use generic, non-sensitive questions only."):t.consent}</span></label>
      <button disabled={!canAsk || !consent || pending} className="min-h-12 rounded-xl bg-teal-800 px-6 font-semibold text-white disabled:opacity-50">{pending ? t.pending : t.send}</button>
      {error && <p role="alert" className="rounded-xl bg-amber-50 p-4 text-amber-950">{t[error]}</p>}
    </form>
    {demo && <button disabled={!preview.state.signedIn} type="button" onClick={()=>setError("error")} className="mt-4 min-h-11 text-teal-800 underline">{lang === "zh" ? "模拟服务错误（不扣演示额度）" : "Simulate provider error (no demo quota charge)"}</button>}
    <div className="mt-6 flex flex-wrap gap-5 text-teal-800 underline"><Link href="/pricing">{t.pricing}</Link>{!(demo?preview.state.signedIn:!!usage)&&<Link href={demo?"/signup?mode=demo&next=%2Fchat":"/signup?next=%2Fchat"}>{t.login}</Link>}<Link href="/consultation">{lang === "zh" ? "预约一对一咨询" : "Book a Consultation"}</Link></div>
    <p className="mt-6 text-xs leading-relaxed text-stone-500">{demo?(zh?"对话仅保留在此页面，刷新即清除。本地演示不发送或保留外部聊天记录；演示额度不是服务端真实权益。":"Conversation clears on reload. This local demo sends nothing to an external provider; demo quotas are not real server entitlements."):t.demo}</p>
  </div>;
}
