"use client";
import Link from "next/link";
import { usePreview } from "./preview/PreviewProvider";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import type { Lang } from "@/lib/i18n";
import { CONSENT_KEY, consented, trackEvent } from "@/lib/analytics/events";
export function AnalyticsConsent({ lang }: { lang: Lang }) {
  const [choice, setChoice] = useState<boolean | null>(null);
  const path = usePathname();
  const preview=usePreview();
  useEffect(() => { setChoice(consented()); }, []);
  useEffect(() => {
    if (choice !== true) return;
    if (path === "/") trackEvent({ event: "landing_visit", language: lang });
    if (path === "/pricing") trackEvent({ event: "subscription_page_view", language: lang });
    // Only claim one-time verified milestones after analytics consent. No provider/user identity enters GTM.
    const controller = new AbortController();
    void fetch("/api/analytics/milestones", { method: "POST", credentials: "same-origin", referrerPolicy: "no-referrer", signal: controller.signal })
      .then(r => r.ok ? r.json() : null).then(data => {
        if (!consented()) return;
        if (data?.registration === true) trackEvent({ event: "account_registration", language: lang });
        if (data?.activation === true) trackEvent({ event: "subscription_activated", language: lang, plan: data.plan });
      }).catch(() => {});
    return () => controller.abort();
  }, [choice, path, lang]);
  if (process.env.NEXT_PUBLIC_GTM_EVENTS_ENABLED !== "true") return <aside className="mx-auto max-w-6xl px-5 pb-5 text-xs"><p>{lang==="zh"?"实际产品统计已关闭，不收集事件。":"Real product analytics is OFF; no events are collected."}</p>{preview.enabled&&<Link href="/analytics" className="mt-2 inline-flex min-h-11 items-center text-teal-800 underline">{lang==="zh"?"查看独立的合成 GTM 仪表盘":"View isolated synthetic GTM Dashboard"}</Link>}</aside>;
  function choose(value: boolean) {
    try { localStorage.setItem(CONSENT_KEY, value ? "yes" : "no"); setChoice(value); }
    catch { setChoice(false); }
  }
  return <aside className="mx-auto max-w-6xl px-5 pb-5 text-xs" aria-label={lang === "zh" ? "统计偏好" : "Analytics preferences"}>
    <p>{lang === "zh" ? "可选匿名产品统计，不包含聊天内容、家庭资料或身份信息。默认关闭。" : "Optional anonymous product analytics. No chat text, household details or identity. Off by default."}</p>
    <div className="mt-2 flex flex-wrap gap-4"><button onClick={() => choose(true)} disabled={choice === true} className="min-h-11 underline disabled:no-underline">{lang === "zh" ? "同意匿名统计" : "Allow anonymous analytics"}</button><button onClick={() => choose(false)} className="min-h-11 underline">{lang === "zh" ? "拒绝 / 撤回同意" : "Decline / withdraw consent"}</button></div>
  </aside>;
}
