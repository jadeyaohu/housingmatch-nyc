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
    </>
  );
}
