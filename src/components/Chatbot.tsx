"use client";
import { usePreview, PreviewNotice } from "./preview/PreviewProvider";
import { demoFaqAnswer } from "@/lib/chat/demo-faq";
import { PLANS, nyDay } from "@/lib/subscriptions/model";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
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
  const scrollRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (demo) {setUsage({plan:preview.state.plan,used:preview.state.day===nyDay(new Date())?preview.state.used:0,limit:PLANS[preview.state.plan].messages});return;}
    if (enabled) void fetch("/api/subscriptions/status", { credentials: "same-origin", referrerPolicy: "no-referrer" }).then(r => r.ok ? r.json() : null).then(setUsage).catch(() => {});
  }, [enabled,demo,preview.state.plan,preview.state.used,preview.state.day]);
  useEffect(() => { const el = scrollRef.current; if (el) el.scrollTop = el.scrollHeight; }, [messages, pending]);
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
  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); formRef.current?.requestSubmit?.(); }
  }
  return <div className="mx-auto max-w-3xl">
    {demo && <PreviewNotice lang={lang}/>}
    <h1 className="text-xl font-bold sm:text-2xl">{t.title}</h1><p className="mt-1 text-sm text-stone-600">{demo?(zh?"本地 FAQ 演示，不会调用 Gemini。免费房源、AMI 工具与问卷始终开放。":"Local FAQ demo: no Gemini call. Free search, AMI tools and Quiz remain available."):enabled?t.sub:(zh?"AI 助手即将推出。当前可免费搜索房源并使用 AMI 问卷。":"AI guidance is coming soon. Free housing search and the AMI Quiz are available now.")}</p>
    <aside className="my-4 rounded-xl bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-950">{t.notice}</aside>
    {usage && <p className="mb-3 text-sm font-semibold">{t.usage}: {usage.used}/{usage.limit} · {t.reset}</p>}
    {!enabled && <p role="status" className="my-5 rounded-xl border p-4">{t.unavailable}</p>}
    {enabled && <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
      <div ref={scrollRef} aria-live="polite" aria-busy={pending} className="h-[52vh] space-y-4 overflow-y-auto bg-stone-50 p-4 sm:h-[60vh] sm:p-5">
        {messages.length === 0 && <>
          <div className="flex gap-2">
            <span aria-hidden className="flex size-8 shrink-0 items-center justify-center rounded-full bg-teal-800 text-xs font-bold text-white">AI</span>
            <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-white px-4 py-3 text-sm leading-relaxed shadow-sm">{t.greeting}</div>
          </div>
          <div className="flex flex-wrap gap-2 pl-10">
            {t.suggestions.map(s => <button key={s} type="button" disabled={!canAsk} onClick={() => { setQuestion(s); inputRef.current?.focus(); }} className="rounded-full border border-teal-800/30 bg-white px-3 py-1.5 text-xs text-teal-800 disabled:opacity-50">{s}</button>)}
          </div>
        </>}
        {messages.map((m, i) => <div key={i} className="space-y-4">
          <div className="flex justify-end">
            <div className="max-w-[85%] whitespace-pre-wrap break-words rounded-2xl rounded-br-sm bg-teal-800 px-4 py-3 text-sm leading-relaxed text-white shadow-sm">{m.question}</div>
          </div>
          <div className="flex gap-2">
            <span aria-hidden className="flex size-8 shrink-0 items-center justify-center rounded-full bg-teal-800 text-xs font-bold text-white">AI</span>
            <div className="min-w-0 max-w-[85%]">
              <div className="whitespace-pre-wrap break-words rounded-2xl rounded-tl-sm bg-white px-4 py-3 text-sm leading-relaxed shadow-sm">{m.answer}</div>
              <p className="mt-1.5"><span className="rounded-full bg-teal-50 px-2 py-0.5 text-[11px] font-medium text-teal-800">{t[m.source]}</span></p>
            </div>
          </div>
        </div>)}
        {pending && <div className="flex gap-2">
          <span aria-hidden className="flex size-8 shrink-0 items-center justify-center rounded-full bg-teal-800 text-xs font-bold text-white">AI</span>
          <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-sm bg-white px-4 py-3 shadow-sm">
            <span className="size-2 animate-bounce rounded-full bg-stone-400" style={{animationDelay:"0ms"}}/>
            <span className="size-2 animate-bounce rounded-full bg-stone-400" style={{animationDelay:"150ms"}}/>
            <span className="size-2 animate-bounce rounded-full bg-stone-400" style={{animationDelay:"300ms"}}/>
          </div>
        </div>}
      </div>
      <form ref={formRef} onSubmit={submit} className="border-t bg-white p-3 sm:p-4" data-testid="chat-composer">
        <div className="flex items-end gap-2">
          <label className="sr-only" htmlFor="chat-question">{t.label}</label>
          <textarea id="chat-question" ref={inputRef} value={question} onChange={e=>setQuestion(e.target.value)} onKeyDown={handleKeyDown} maxLength={1000} required disabled={!canAsk || pending} rows={2} placeholder={t.label} className="max-h-32 min-h-11 flex-1 resize-none overflow-y-auto rounded-xl border border-stone-300 bg-white p-3 text-sm disabled:opacity-60" />
          <button type="submit" disabled={!canAsk || !consent || pending} aria-label={t.send} className="flex size-11 shrink-0 items-center justify-center rounded-full bg-teal-800 text-white disabled:opacity-50">
            {pending ? <span className="size-5 animate-spin rounded-full border-2 border-white/40 border-t-white" /> : <svg aria-hidden viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-5"><path d="M22 2 11 13"/><path d="M22 2 15 22l-4-9-9-4z"/></svg>}
          </button>
        </div>
        <label className="mt-3 flex items-start gap-2 text-xs text-stone-600"><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)} disabled={!canAsk || pending} className="mt-0.5 size-4 shrink-0"/><span>{demo?(zh?"我了解这是本地 FAQ 演示，问题不会发送给 Google 或 Gemini；我只输入一般性非敏感问题。":"I understand this is a local FAQ demo. No question is sent to Google or Gemini; I will use generic, non-sensitive questions only."):t.consent}</span></label>
        {error && <p role="alert" className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-950">{t[error]}</p>}
      </form>
    </div>}
    {demo && <button disabled={!preview.state.signedIn} type="button" onClick={()=>setError("error")} className="mt-4 min-h-11 text-teal-800 underline">{lang === "zh" ? "模拟服务错误（不扣演示额度）" : "Simulate provider error (no demo quota charge)"}</button>}
    <div className="mt-6 flex flex-wrap gap-5 text-teal-800 underline"><Link href="/pricing">{t.pricing}</Link>{!(demo?preview.state.signedIn:!!usage)&&<Link href={demo?"/signup?mode=demo&next=%2Fchat":"/signup?next=%2Fchat"}>{t.login}</Link>}<Link href="/consultation">{lang === "zh" ? "预约一对一咨询" : "Book a Consultation"}</Link></div>
    {enabled && <p className="mt-6 text-xs leading-relaxed text-stone-500">{demo?(zh?"对话仅保留在此页面，刷新即清除。本地演示不发送或保留外部聊天记录；演示额度不是服务端真实权益。":"Conversation clears on reload. This local demo sends nothing to an external provider; demo quotas are not real server entitlements."):t.demo}</p>}
  </div>;
}
