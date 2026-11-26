import Link from "next/link";
import { getLang } from "@/lib/lang";
import { consultationCopy } from "@/lib/consultation/content";
import { PRIVACY_VERSION, TERMS_VERSION } from "@/lib/consultation/model";

export async function ConsultationPolicy({ kind }: { kind: "terms" | "cancellation" | "privacy" }) {
  const t = consultationCopy[await getLang()];
  const sections = kind === "terms" ? t.termsSections : kind === "cancellation" ? t.cancellationSections : t.privacySections;
  return <article className="mx-auto max-w-3xl"><h1 className="text-3xl font-bold">{t[kind]}</h1><p className="mt-4 text-sm text-amber-900">{t.draft}</p><p className="mt-2 break-words text-xs text-stone-500">{t.version}: {kind === "privacy" ? PRIVACY_VERSION : TERMS_VERSION} · {t.effective}</p><div className="mt-8 space-y-7">{sections.map(([title, body]) => <section key={title}><h2 className="text-lg font-semibold">{title}</h2><p className="mt-2 leading-relaxed text-stone-600">{body}</p></section>)}</div><p className="mt-8 rounded-xl bg-teal-50 p-5 text-sm leading-relaxed">{t.disclosure}</p><nav className="mt-6 flex flex-wrap gap-5 text-sm text-teal-800 underline"><Link href="/consultation">{t.nav}</Link><Link href="/consultation/terms">{t.terms}</Link><Link href="/consultation/cancellation">{t.cancellation}</Link><Link href="/privacy">{t.privacy}</Link><Link href="/quiz">{t.free}</Link></nav></article>;
}
