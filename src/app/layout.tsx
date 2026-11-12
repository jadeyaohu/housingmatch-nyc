import { AnalyticsConsent } from "@/components/AnalyticsConsent";
import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { dict } from "@/lib/i18n";
import { getLang } from "@/lib/lang";
import { LangToggle } from "@/components/LangToggle";
import { authConfig } from "@/lib/supabase/config";
import { currentUser } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "HousingMatch NYC",
  description: "Discover NYC affordable housing lotteries matched to your household.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const lang = await getLang();
  const t = dict[lang];
  const user = authConfig() ? await currentUser() : null;
  return (
    <html lang={lang === "zh" ? "zh-Hans" : "en"}>
      <body className="min-h-screen bg-stone-50 text-stone-900 antialiased">
        <header className="border-b border-stone-200 bg-white/80 backdrop-blur">
          <nav className="mx-auto flex max-w-6xl items-center justify-between gap-3 flex-wrap px-4 py-3 sm:px-5">
            <Link href="/" aria-label="HousingMatch NYC" className="flex min-w-0 shrink items-center gap-2 whitespace-nowrap font-semibold tracking-tight">
              <span aria-hidden className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-teal-800 text-sm text-white">H</span>
              {/* Below 400px only the logo shows, so the language switch always fits (issue #7). */}
              <span className="max-[399px]:sr-only">HousingMatch<span className="hidden sm:inline"> NYC</span></span>
            </Link>
            <div className="flex w-full flex-wrap items-center justify-between gap-2 text-xs sm:w-auto sm:text-sm sm:gap-5">
              <Link href="/quiz" className="hidden text-stone-600 hover:text-stone-900 sm:inline">{t.navMatch}</Link>
              <Link href="/listings" className="text-stone-600 hover:text-stone-900">{t.navListings}</Link>
              <Link href="/prepare" className="hidden text-stone-600 hover:text-stone-900 md:inline">{lang === "zh" ? "准备材料" : "Get documents ready"}</Link>
              {authConfig() && (
                <Link href={user ? "/account" : "/signup"} className="hidden text-stone-600 hover:text-stone-900 sm:inline">{user ? t.navAccount : t.navSignIn}</Link>
              )}
              <Link href="/chat" className="text-teal-800">{lang === "zh" ? "住房问答" : "Ask housing"}</Link>
              <Link href="/pricing" className="text-teal-800">{lang === "zh" ? "方案" : "Plans"}</Link>
              <Link href="/consultation" className="text-teal-800">{lang === "zh" ? "咨询" : "Consultation"}</Link>
              <LangToggle lang={lang} />
            </div>
          </nav>
        </header>
        {process.env.BETA_FIXTURES === "synthetic" && <p role="status" className="bg-amber-50 px-5 py-2 text-center text-sm text-amber-950">{lang === "zh" ? "虚构开发数据，非真实住房信息" : "Synthetic development data — not real housing offers"}</p>}
        <main className="mx-auto max-w-6xl px-5 py-10">{children}</main>
        <footer className="border-t border-stone-200 bg-white">
          <p className="mx-auto max-w-6xl px-5 py-6 text-xs leading-relaxed text-stone-500">{t.footer} <Link href="/privacy" className="underline underline-offset-2">{t.privacyNav}</Link></p>
        <AnalyticsConsent lang={lang}/></footer>
      </body>
    </html>
  );
}
