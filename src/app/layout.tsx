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
          <nav className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-5">
            <Link href="/" aria-label="HousingMatch NYC" className="flex min-w-0 shrink items-center gap-2 whitespace-nowrap font-semibold tracking-tight">
              <span aria-hidden className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-teal-800 text-sm text-white">H</span>
              {/* Below 400px only the logo shows, so the language switch always fits (issue #7). */}
              <span className="max-[399px]:sr-only">HousingMatch<span className="hidden sm:inline"> NYC</span></span>
            </Link>
            <div className="flex shrink-0 items-center gap-2 whitespace-nowrap text-sm sm:gap-5">
              <Link href="/quiz" className="hidden text-stone-600 hover:text-stone-900 sm:inline">{t.navMatch}</Link>
              <Link href="/listings" className="text-stone-600 hover:text-stone-900">{t.navListings}</Link>
              <LangToggle lang={lang} />
            </div>
          </nav>
        </header>
        <main className="mx-auto max-w-6xl px-5 py-10">{children}</main>
        <footer className="border-t border-stone-200 bg-white">
          <p className="mx-auto max-w-6xl px-5 py-6 text-xs leading-relaxed text-stone-500">{t.footer}</p>
        </footer>
      </body>
    </html>
  );
}
