"use client";
import { usePreview, PreviewNotice } from "./preview/PreviewProvider";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { Lang } from "@/lib/i18n";
import { PLANS, type Plan } from "@/lib/subscriptions/model";
import { pricingCopy } from "@/lib/subscriptions/content";
import { trackEvent } from "@/lib/analytics/events";
export function SubscriptionPricing({ lang, enabled, demo=false }: { lang: Lang; enabled: boolean; demo?: boolean }) {
  const t = pricingCopy[lang];
  const preview=usePreview();
  const [demoCheckout,setDemoCheckout]=useState<Plan|null>(null);
  const [consent, setConsent] = useState(false), [busy, setBusy] = useState(false), [message, setMessage] = useState("");
  const [status, setStatus] = useState<{plan: Plan; used: number; limit: number; alert_opt_in: boolean} | null>(null);
  const [alert, setAlert] = useState(false);
  useEffect(() => {
    if(demo){setStatus({plan:preview.state.plan,used:preview.state.used,limit:PLANS[preview.state.plan].messages,alert_opt_in:preview.state.alerts});return;}
    let stopped = false;
    const controller = new AbortController();
    const refresh = () => fetch("/api/subscriptions/status", { credentials: "same-origin", referrerPolicy: "no-referrer", signal: controller.signal }).then(r=>r.ok?r.json():null).then(s=>{if (!stopped) { setStatus(s); setAlert(s?.alert_opt_in === true); }}).catch(()=>{});
    void refresh();
    const returned = new URLSearchParams(window.location.search).has("checkout");
    if (returned) setMessage(t.returned);
    let attempts = 0;
    const timer = returned ? setInterval(() => { if (++attempts <= 12) void refresh(); }, 5000) : null;
    return () => { stopped = true; controller.abort(); if (timer) clearInterval(timer); };
  }, [t.returned,demo,preview.state.plan,preview.state.used,preview.state.alerts]);
  async function action(kind: "checkout" | "cancel" | "alerts", plan?: Plan) {
    if (busy) return;
    if(demo){
      if(!preview.state.signedIn){setMessage(lang==="zh"?"请先登录演示账号。":"Sign in to the demo account first.");return;}
      if(kind==="checkout"&&plan){setDemoCheckout(plan);preview.record("checkout_initiated",lang);}
      if(kind==="cancel"){preview.update(s=>({...s,plan:"free",alerts:false}));setMessage(lang==="zh"?"演示订阅已取消，无真实付款。":"Demo subscription cancelled; no real payment.");}
      if(kind==="alerts"){preview.update(s=>({...s,alerts:alert}));setMessage(t.alertSaved);}
      return;
    }
    setBusy(true); setMessage("");
    try {
      const r = await fetch(`/api/subscriptions/${kind}`, { method:"POST", credentials:"same-origin", referrerPolicy:"no-referrer", headers:{"Content-Type":"application/json"}, body:JSON.stringify(kind === "checkout" ? {plan,consent} : kind === "alerts" ? {enabled:alert} : {}) });
      const data = await r.json();
      if (!r.ok) { setMessage(r.status === 409 ? t.busy : r.status === 401 ? (lang === "zh" ? "请先登录免费账号。" : "Please sign in to your free account first.") : t.error); return; }
      if (kind === "checkout") {
        const url = new URL(data.url);
        if (url.origin !== "https://checkout.stripe.com") throw new Error("invalid_url");
        trackEvent({ event:"checkout_initiated", language:lang, plan });
        window.location.assign(url.href);
      } else setMessage(kind === "cancel" ? t.cancelDone : t.alertSaved);
    } catch { setMessage(t.error); } finally { setBusy(false); }
  }
  return <div>
    {demo && <PreviewNotice lang={lang}/>}
    <header className="mx-auto max-w-3xl text-center"><p className="text-xs font-bold uppercase tracking-widest text-teal-800">Pricing v3 · TEST Beta</p><h1 className="mt-3 text-4xl font-bold sm:text-5xl">{t.title}</h1><p className="mt-5 text-lg text-stone-600">{t.intro}</p></header>
    <div className="mt-9 grid gap-5 md:grid-cols-3">{(Object.keys(PLANS) as Plan[]).map(plan=><section key={plan} className={`flex flex-col rounded-3xl border bg-white p-6 ${plan === "smart" ? "border-teal-800 shadow-sm" : "border-stone-200"}`}>
      <h2 className="text-xl font-semibold">{t.names[plan]}</h2><p className="my-5"><span className="text-4xl font-bold">${(PLANS[plan].cents/100).toFixed(plan === "free" ? 0 : 2)}</span><span className="ml-1 text-stone-600">{plan !== "free" && t.month}</span></p>
      <p className="font-semibold text-teal-900">{PLANS[plan].messages} {t.perDay}</p>
      <ul className="my-5 flex-1 space-y-3 text-sm leading-relaxed text-stone-600"><li>{t.freeFeature}</li>{plan !== "free" && <li>{t.alerts}</li>}{plan === "smart" && <li>{t.smart}</li>}</ul>
      {plan === "free" ? <Link href="/chat" className="min-h-12 rounded-xl border border-teal-800 p-3 text-center font-semibold text-teal-800">{t.start}</Link> : <button onClick={()=>action("checkout",plan)} disabled={!enabled || !consent || busy || (!demo && !!status && status.plan !== "free")} className="min-h-12 rounded-xl bg-teal-800 p-3 font-semibold text-white disabled:opacity-50">{busy ? t.pending : demo ? (lang==="zh"?"选择演示方案":"Choose DEMO plan") : t.cta}<span className="sr-only"> — {t.names[plan]}</span></button>}
    </section>)}</div>
    {demoCheckout&&<section role="dialog" aria-modal="false" aria-label="DEMO Checkout" className="mx-auto mt-6 max-w-xl rounded-2xl border-2 border-amber-300 bg-amber-50 p-6"><h2 className="text-xl font-bold">DEMO Checkout · {demoCheckout} · ${(PLANS[demoCheckout].cents/100).toFixed(2)}/month</h2><p className="mt-3">{lang==="zh"?"仅模拟开通，不请求 Stripe、不扣款。":"Simulation only: no Stripe request or charge."}</p><button onClick={()=>{const plan=demoCheckout;preview.update(s=>({...s,plan}));preview.record("subscription_activated",lang);setDemoCheckout(null);setMessage(lang==="zh"?"演示权益已开通。":"Demo entitlement activated.");}} className="mt-4 min-h-12 rounded-xl bg-teal-800 px-5 text-white">{lang==="zh"?"确认模拟订阅":"Confirm simulated subscription"}</button><button className="ml-4 min-h-11 underline" onClick={()=>setDemoCheckout(null)}>{lang==="zh"?"取消":"Cancel"}</button></section>}
    <div className="mx-auto mt-7 max-w-3xl space-y-5 text-sm leading-relaxed">
      {!enabled && <p role="status" className="rounded-xl bg-amber-50 p-4 text-amber-950">{t.disabled}</p>}
      <label className="flex items-start gap-3"><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)} className="mt-1 size-4 shrink-0"/><span>{demo ? (lang==="zh"?"我了解这是合成方案演示，不收集银行卡信息，不会扣款或真实续费。":"I understand this is a synthetic plan simulation: no card, charge or real renewal.") : t.consent} <Link href="/pricing/terms" className="text-teal-800 underline">{t.terms}</Link> · <Link href="/privacy" className="text-teal-800 underline">{lang === "zh" ? "隐私草案" : "Draft privacy notice"}</Link></span></label>
      <p>{t.reset}</p><p>{t.footer}</p>
      {status && <section className="rounded-2xl border p-5"><p>{t.status}: {t.names[status.plan]} · {status.used}/{status.limit}</p>{status.plan !== "free" && <><p className="mt-2 text-xs">{lang === "zh" ? "测试版暂不支持周期中途切换或按比例补差；更换方案需取消并等待当前周期结束。" : "TEST plan changes/proration are not supported yet. Cancel renewal and wait until the current period ends before choosing another plan."}</p><button onClick={()=>action("cancel")} disabled={!enabled || busy} className="mt-3 min-h-11 text-teal-800 underline">{t.cancel}</button><label className="mt-4 flex items-center gap-3"><input type="checkbox" checked={alert} onChange={e=>setAlert(e.target.checked)}/>{t.alerts}</label><button onClick={()=>action("alerts")} disabled={busy} className="mt-2 min-h-11 text-teal-800 underline">{t.alertOpt}</button></>}</section>}
      {message && <p role="status" className="rounded-xl bg-teal-50 p-4">{message}</p>}
      <div className="flex flex-wrap gap-5 text-teal-800 underline"><Link href="/quiz">{lang === "zh" ? "免费资格问卷" : "Free eligibility Quiz"}</Link><Link href="/signup?next=%2Fpricing">{lang === "zh" ? "免费登录" : "Free sign-in"}</Link><Link href="/consultation">{lang === "zh" ? "预约一对一咨询" : "Book a Consultation"}</Link></div>
    </div>
  </div>;
}
