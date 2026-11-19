import { consultationCopy } from "@/lib/consultation/content";
import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { dict } from "@/lib/i18n";
import { getLang } from "@/lib/lang";
import { LangToggle } from "@/components/LangToggle";

export const metadata: Metadata = {
  title: "HousingMatch NYC",
  description: "Discover NYC affordable housing lotteries matched to your household.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const lang = await getLang();
  const t = dict[lang];
  return (
    <html lang={lang === "zh" ? "zh-Hans" : "en"}>
      <body className="min-h-screen bg-stone-50 text-stone-900 antialiased">
        <header className="border-b border-stone-200 bg-white/80 backdrop-blur">
          <nav className="mx-auto flex max-w-6xl items-center justify-between gap-3 flex-wrap px-4 py-3 sm:px-5">
            <Link href="/" className="flex items-center gap-2 whitespace-nowrap font-semibold tracking-tight">
              <span className="grid h-7 w-7 place-items-center rounded-md bg-teal-800 text-sm text-white">H</span>
              <span>HousingMatch<span className="hidden sm:inline"> NYC</span></span>
            </Link>
            <div className="flex w-full items-center justify-between gap-2 whitespace-nowrap text-xs sm:w-auto sm:gap-5 sm:text-sm">
              <Link href="/" className="hidden text-stone-600 hover:text-stone-900 sm:inline">{t.navMatch}</Link>
              <Link href="/listings" className="text-stone-600 hover:text-stone-900">{t.navListings}</Link>
              <Link href="/consultation" className="text-teal-800 hover:text-teal-950">{consultationCopy[lang].nav}</Link>
              <LangToggle lang={lang} />
            </div>
          </nav>
        </header>
        <main className="mx-auto max-w-6xl px-5 py-10">{children}</main>
        <footer className="border-t border-stone-200 bg-white">
          <p className="mx-auto max-w-6xl px-5 py-6 text-xs leading-relaxed text-stone-500">{t.footer} <Link href="/privacy" className="ml-2 underline">{consultationCopy[lang].privacy}</Link></p>
        </footer>
      </body>
    </html>
  );
}
