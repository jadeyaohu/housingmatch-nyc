import Link from "next/link";
import { dict } from "@/lib/i18n";
import { getLang } from "@/lib/lang";

export default async function Home() {
  const lang = await getLang();
  const t = dict[lang];
  const steps = [
    [t.how1, t.how1d],
    [t.how2, t.how2d],
    [t.how3, t.how3d],
  ];
  return (
    <>
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-teal-900 via-teal-800 to-emerald-700 px-6 py-14 text-white sm:px-12 sm:py-20">
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

      <p className="mt-10 text-sm text-stone-600">
        <Link href="/match" className="font-medium text-teal-800 underline underline-offset-4">{t.quickMatch}</Link>
      </p>
    </>
  );
}
