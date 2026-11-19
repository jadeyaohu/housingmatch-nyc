import Link from "next/link";
import { consultationCopy } from "@/lib/consultation/content";
import { dict } from "@/lib/i18n";
import { getLang } from "@/lib/lang";
import { Matcher } from "@/components/Matcher";

export default async function Home() {
  const lang = await getLang();
  const t = dict[lang];
  return (
    <>
      <section className="mb-10 max-w-3xl">
        <h1 className="text-4xl font-bold tracking-tight text-stone-900 sm:text-5xl">{t.heroTitle}</h1>
        <p className="mt-4 text-lg leading-relaxed text-stone-600">{t.heroSub}</p>
      </section>
      <Matcher lang={lang} />
      <section className="mt-14 rounded-3xl border border-stone-200 bg-white p-6 sm:p-8">
        <h2 className="text-2xl font-semibold">{consultationCopy[lang].homeTitle}</h2>
        <p className="mt-3 max-w-2xl leading-relaxed text-stone-600">{consultationCopy[lang].homeBody}</p>
        <Link href="/consultation" className="mt-5 inline-block rounded-xl border border-teal-800 px-5 py-3 font-semibold text-teal-800 hover:bg-teal-50">{consultationCopy[lang].nav}</Link>
      </section>
    </>
  );
}
