"use client";
import { useState } from "react";
import { dict, type Lang } from "@/lib/i18n";
import { MatchResults, type Row } from "./MatchResults";

/**
 * Secondary discovery: re-rentals and waiting lists, visually separate from lease-up matches and
 * never counted with them. Collapsed by default.
 */
export function RerentalSection({ rows, lang }: { rows: Row[]; lang: Lang }) {
  const t = dict[lang];
  const [open, setOpen] = useState(false);
  const relevant = rows.filter((r) => r.result.status !== "UNLIKELY_MATCH" && r.result.matchesPreferences).length;

  return (
    <section data-testid="rerentals" aria-labelledby="rr-heading" className="mt-10 rounded-2xl border border-dashed border-indigo-300 bg-indigo-50/40 p-5">
      <h2 id="rr-heading" className="text-lg font-semibold text-stone-900">{t.rr_heading}</h2>
      <p className="mt-1 text-sm text-stone-600">{t.rr_sub}</p>
      <ul className="mt-3 space-y-1 text-sm text-stone-700">
        {[t.rr_note1, t.rr_note2, t.rr_note3].map((n) => (
          <li key={n} className="flex gap-2">
            <span aria-hidden>•</span>
            {n}
          </li>
        ))}
      </ul>
      {rows.length === 0 ? (
        <p className="mt-4 text-sm text-stone-500">{t.rr_none}</p>
      ) : (
        <>
          <button
            type="button"
            aria-expanded={open}
            onClick={() => setOpen(!open)}
            className="mt-4 min-h-11 rounded-xl border border-indigo-300 bg-white px-4 text-sm font-semibold text-indigo-900 hover:bg-indigo-50"
          >
            {open ? t.rr_hide : t.rr_show.replace("{n}", String(relevant || rows.length))}
          </button>
          {open && (
            <div className="mt-4">
              <MatchResults rows={rows} lang={lang} variant="secondary" />
            </div>
          )}
        </>
      )}
    </section>
  );
}
