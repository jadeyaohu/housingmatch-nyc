import { bookingConfigured } from "@/lib/consultation/config";
import { previewDemoEnabled } from "@/lib/preview/config";
import Link from "next/link";
import { getLang } from "@/lib/lang";
import { consultationCopy } from "@/lib/consultation/content";
import { PACKAGES } from "@/lib/consultation/model";

export default async function ConsultationPage() {
  const lang = await getLang(), t = consultationCopy[lang];
  const available = bookingConfigured() || previewDemoEnabled();
  return <div className="mx-auto max-w-5xl">
    <header className="max-w-3xl">
      <p className="text-xs font-bold tracking-widest text-teal-800">{t.eyebrow}</p>
      <h1 className="mt-4 text-4xl font-bold leading-tight tracking-tight sm:text-5xl">{t.title}</h1>
      <p className="mt-5 text-lg leading-relaxed text-stone-600">{t.intro}</p>
      <div className="mt-5 flex flex-wrap gap-4 text-sm font-semibold text-teal-800"><Link href="/quiz" className="underline">{t.free}</Link><Link href="/listings" className="underline">{t.browse}</Link></div>
    </header>
    <div className="mt-10 grid gap-6 md:grid-cols-2">
      {(["standard", "expert"] as const).map((key) => <section key={key} className={`flex flex-col rounded-3xl border bg-white p-6 shadow-sm sm:p-8 ${key === "expert" ? "border-teal-800 border-t-4" : "border-stone-200"}`}>
        <h2 className="text-xl font-semibold">{t[key]}</h2>
        <p className="mt-5 flex flex-wrap items-baseline gap-2"><span className="text-5xl font-bold tracking-tight">${PACKAGES[key].priceCents / 100}</span><span className="text-stone-600">/ {PACKAGES[key].minutes} {t.minutes}</span></p>
        <p className="mt-2 text-sm text-stone-500">{t.oneTime}</p>
        <ul className="my-7 flex-1 space-y-4 text-sm leading-relaxed text-stone-700">{t.features[key].map((feature) => <li key={feature} className="flex gap-3"><span aria-hidden="true" className="font-bold text-teal-700">✓</span><span>{feature}</span></li>)}</ul>
        {available ? <Link href={`/consultation/book?package=${key}`} className="rounded-xl bg-teal-800 px-5 py-3 text-center font-semibold text-white hover:bg-teal-900">{t.booking}<span className="sr-only"> — {t[key]}</span></Link> : <p role="status" className="rounded-xl bg-stone-100 p-4 text-center font-semibold">{lang === "zh" ? "即将推出 · 暂不接受请求或付款" : "Coming Soon · Requests and payments unavailable"}</p>}
      </section>)}
    </div>
    <aside className="mt-7 rounded-2xl bg-teal-50 p-5 text-sm leading-relaxed text-teal-950"><p className="font-semibold">{t.noCharge}</p><p className="mt-3">{t.disclosure}</p></aside>
    <p className="mt-5 text-sm text-amber-900">{t.draft}</p>
    <div className="mt-4 flex flex-wrap gap-5 text-sm text-teal-800 underline"><Link href="/consultation/terms">{t.terms}</Link><Link href="/consultation/cancellation">{t.cancellation}</Link><Link href="/privacy">{t.privacy}</Link></div>
  </div>;
}
