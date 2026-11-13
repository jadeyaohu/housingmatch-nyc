import { bookingConfigured } from "@/lib/consultation/config";
import { previewDemoEnabled } from "@/lib/preview/config";
import { consultationCopy } from "@/lib/consultation/content";
import{approvedPhotos,HERO_PHOTO_ID,listingPhotos}from"@/lib/photos/model";
import{ListingMedia}from"@/components/ListingMedia";
import Link from "next/link";
import { dict } from "@/lib/i18n";
import { getLang } from "@/lib/lang";

export default async function Home() {
  const lang = await getLang();
  const actual = (await import("@/lib/photos/property")).propertyPhotos()[0];
  const heroPhoto = actual ? listingPhotos(`hc-${actual.lotteryId}`)[0] : process.env.BETA_FIXTURES === "synthetic" && !process.env.VERCEL_ENV ? approvedPhotos("home").find(p=>p.id===HERO_PHOTO_ID) : undefined;
  const t = dict[lang];
  const consultationAvailable = bookingConfigured() || previewDemoEnabled();
  const steps = [
    [t.how1, t.how1d],
    [t.how2, t.how2d],
    [t.how3, t.how3d],
  ];
  return (
    <>
      <section className="relative grid gap-8 overflow-hidden rounded-3xl lg:grid-cols-2 bg-gradient-to-br from-teal-900 via-teal-800 to-emerald-700 px-6 py-14 text-white sm:px-12 sm:py-20">
        <div aria-hidden className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/10" />
        <div aria-hidden className="absolute -bottom-32 right-24 h-80 w-80 rounded-full bg-emerald-400/20" />
        <div className="relative max-w-2xl">
          <h1 className="text-4xl font-bold leading-tight tracking-tight sm:text-5xl">{t.heroTitle2}</h1>
          <p className="mt-5 text-lg leading-relaxed text-teal-50 sm:text-xl">{t.heroSub2}</p>
          <Link
            href="/quiz"
            data-testid="hero-cta"
            className="mt-8 inline-flex min-h-14 items-center justify-center rounded-2xl bg-white px-7 text-lg font-semibold text-teal-900 shadow-lg transition hover:bg-teal-50"
          >
            {t.heroCta}
          </Link>
          <p className="mt-3 text-sm text-teal-100">{t.heroCtaNote}</p>
        </div>
        <div className="relative self-center overflow-hidden rounded-2xl shadow-xl"><ListingMedia lang={lang} listingId={heroPhoto?.propertyId ?? undefined} photo={heroPhoto} layout="hero"/></div>
      </section>


      <section className="mt-12 grid gap-4 sm:grid-cols-3">
        {steps.map(([h, d], i) => (
          <div key={h} className="rounded-2xl border border-stone-200 bg-white p-5">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-teal-50 font-bold text-teal-800">{i + 1}</span>
            <h2 className="mt-3 font-semibold text-stone-900">{h}</h2>
            <p className="mt-1 text-sm leading-relaxed text-stone-600">{d}</p>
          </div>
        ))}
      </section>

      <section className="mt-12 rounded-3xl border border-stone-200 bg-white p-6 sm:p-8">
        <h2 className="text-2xl font-semibold">{consultationCopy[lang].homeTitle}</h2>
        <p className="mt-3 leading-relaxed text-stone-600">{consultationCopy[lang].homeBody}</p>
        <Link href="/consultation" className="mt-5 inline-block rounded-xl border border-teal-800 px-5 py-3 font-semibold text-teal-800">{consultationAvailable ? consultationCopy[lang].booking : lang === "zh" ? "查看咨询方案 · 即将推出" : "View consultation plans · Coming Soon"}</Link>
      </section>
      <section className="mt-8 rounded-3xl bg-teal-50 p-6"><h2 className="text-2xl font-semibold">{lang === "zh" ? "住房问题，清楚解答" : "Housing questions, clearly explained"}</h2><p className="mt-3">{lang === "zh" ? "AI 助手与订阅即将推出，尚未开放消息额度或购买。现在即可免费使用房源搜索和 AMI 问卷。" : "AI guidance and subscriptions are coming soon; message allowances and purchases are not available yet. Housing search and the AMI Quiz are free now."}</p><div className="mt-4 flex gap-5 text-teal-800 underline"><Link href="/chat">{lang === "zh" ? "住房问答" : "Ask housing"}</Link><Link href="/pricing">{lang === "zh" ? "比较方案" : "Compare plans"}</Link></div></section>
      <p className="mt-10 text-sm text-stone-600">
        <Link href="/match" className="font-medium text-teal-800 underline underline-offset-4">{t.quickMatch}</Link>
      </p>
    </>
  );
}
