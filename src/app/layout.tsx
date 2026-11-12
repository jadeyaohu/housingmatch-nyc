import { AnalyticsConsent } from "@/components/AnalyticsConsent";
import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { dict } from "@/lib/i18n";
import { getLang } from "@/lib/lang";
import { AppNavigation } from "@/components/AppNavigation";
import { PreviewProvider } from "@/components/preview/PreviewProvider";
import { previewDemoEnabled } from "@/lib/preview/config";
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
      <body className="pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-0 min-h-screen bg-stone-50 text-stone-900 antialiased">
        <PreviewProvider enabled={previewDemoEnabled()} lang={lang}>
        <AppNavigation lang={lang} signedIn={!!user}/>
        {previewDemoEnabled()&&<aside data-testid="demo-reset-warning" className="border-b border-amber-300 bg-amber-100 px-5 py-3 text-center text-sm font-bold text-amber-950">{lang==="zh"?"演示提醒：刷新、重新打开或直接输入网址会清空演示账号、收藏、方案和额度。请使用本站菜单继续体验；不会保存真实客户资料。":"DEMO RESET NOTICE: Reloading, reopening or typing a URL clears the demo account, saves, plan and quota. Use the site menus to continue; no real customer data is stored."}</aside>}
        {process.env.BETA_FIXTURES === "synthetic" && <p role="status" className="bg-amber-50 px-5 py-2 text-center text-sm text-amber-950">{lang === "zh" ? "虚构开发数据，非真实住房信息" : "Synthetic development data — not real housing offers"}</p>}
        <main className="mx-auto max-w-6xl px-5 py-10 pb-32 md:pb-10">{children}</main>
        <footer className="border-t border-stone-200 bg-white">
          <p className="mx-auto max-w-6xl px-5 py-6 text-xs leading-relaxed text-stone-500">{t.footer} <Link href="/privacy" className="underline underline-offset-2">{t.privacyNav}</Link></p>
        <AnalyticsConsent lang={lang}/>{previewDemoEnabled()&&<p className="mx-auto max-w-6xl px-5 pb-5 text-xs text-stone-500" data-testid="preview-build">PREVIEW · {process.env.VERCEL_GIT_COMMIT_SHA?.slice(0,12)??"local-synthetic"} · <Link href="/help" className="underline">{lang==="zh"?"功能状态":"Feature status"}</Link></p>}</footer></PreviewProvider>
      </body>
    </html>
  );
}
