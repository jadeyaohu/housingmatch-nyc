"use client";
import { safeProviderURL } from "@/lib/directory/search";
import { useState } from "react";
import type { AuthConfig } from "@/lib/supabase/config";
import type { Lang } from "@/lib/i18n";
import { SaveButton } from "./SaveButton";

export interface SavedItem {
  id: string;
  name: string;
  where: string;
  deadline: string | null;
  daysLeft: number | null;
  state: "open" | "closing" | "closed" | "unknown";
  url: string | null;
}

const L = {
  en: { soon: "{n} saved home(s) close within 7 days. Apply on the official site before the deadline.", title: "Saved homes", none: "Nothing saved yet. Tap ♡ Save on any result.", closes: "Applications close {d}", closesIn: "Closes in {n} days", today: "Closes today", closed: "Closed — no longer accepting applications", unknown: "No deadline published — check the source", gone: "This listing is no longer in our data.", open: "View listing ↗" },
  zh: { soon: "你收藏的房源里有 {n} 个将在 7 天内截止，请在截止前到官方网站申请。", title: "收藏的房源", none: "还没有收藏。在任何结果上点 ♡ 收藏 即可。", closes: "截止日期 {d}", closesIn: "还有 {n} 天截止", today: "今天截止", closed: "已截止，不再接受申请", unknown: "没有公布截止日期，请查看来源", gone: "这个房源已不在我们的数据中。", open: "查看房源 ↗" },
} as const;

export function SavedList({ cfg, items, lang }: { cfg: AuthConfig; items: SavedItem[]; lang: Lang }) {
  const t = L[lang];
  const [removed, setRemoved] = useState<Set<string>>(new Set());
  const shown = items.filter((i) => !removed.has(i.id));
  const fill = (s: string, v: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (_, k) => String(v[k] ?? ""));
  return (
    <section data-testid="saved" className="mt-8">
      {shown.some((i) => i.state === "closing") && (
        <p role="status" data-testid="closing-banner" className="mb-3 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-900">
          {fill(t.soon, { n: shown.filter((i) => i.state === "closing").length })}
        </p>
      )}
      <h2 className="font-semibold">{t.title}</h2>
      {shown.length === 0 ? (
        <p className="mt-2 text-sm text-stone-600">{t.none}</p>
      ) : (
        <ul className="mt-3 space-y-3">
          {shown.map((i) => (
            <li key={i.id} data-testid={`saved-${i.id}`} data-state={i.state} className="rounded-2xl border border-stone-200 p-4">
              <p className="font-semibold text-stone-900">{i.name || t.gone}</p>
              {i.where && <p className="text-sm text-stone-600">{i.where}</p>}
              <p className={`mt-1 text-sm font-medium ${i.state === "closing" ? "text-red-800" : i.state === "closed" ? "text-stone-500" : "text-stone-700"}`}>
                {i.state === "closed"
                  ? t.closed
                  : i.daysLeft === 0
                    ? t.today
                    : i.state === "closing" && i.daysLeft != null
                      ? fill(t.closesIn, { n: i.daysLeft })
                      : i.deadline
                        ? fill(t.closes, { d: i.deadline })
                        : t.unknown}
              </p>
              <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
                {i.url ? (
                  <a href={safeProviderURL(i.url) ?? undefined} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-teal-800 underline underline-offset-4">{t.open}</a>
                ) : <span />}
                <SaveButton cfg={cfg} listingId={i.id} initial lang={lang} onChange={(s) => !s && setRemoved((r) => new Set(r).add(i.id))} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
