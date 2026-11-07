"use client";
import { useState } from "react";
import type { Listing, MatchResult, MatchStatus } from "@/lib/types";
import { boroughLabel, dict, unitLabel, type Lang } from "@/lib/i18n";
import type { QualityWarning } from "@/lib/matching/quality";
import { StatusBadge } from "./StatusBadge";

export type Row = { listing: Listing; result: MatchResult };

/**
 * Matcher results, grouped into status sections with data-quality warnings (Issue #5 Phase A).
 *
 * Integration seam for analytics (PR #4): `onDetailsOpen` fires when a card's "Why" <details> is
 * expanded, and `onOfficialLinkClick` on a left or middle click of the official listing link.
 * Both default to no-ops. When PR #4 is reconciled, wire `listing_details_opened` /
 * `application_link_clicked` here (or swap the <a> for TrackedLink) — do not drop either hook.
 */
export function MatchResults({
  rows,
  lang,
  onDetailsOpen,
  onOfficialLinkClick,
}: {
  rows: Row[];
  lang: Lang;
  onDetailsOpen?: (listingId: string) => void;
  onOfficialLinkClick?: (listingId: string) => void;
}) {
  const t = dict[lang];
  const [showUnlikely, setShowUnlikely] = useState(false);

  const shown = rows.filter((r) => showUnlikely || (r.result.status !== "UNLIKELY_MATCH" && r.result.matchesPreferences));
  const inPrefs = (s: MatchStatus) => rows.filter((r) => r.result.matchesPreferences && r.result.status === s).length;
  const likelyN = inPrefs("LIKELY_MATCH");
  const reviewN = inPrefs("NEEDS_REVIEW");
  const hiddenN = rows.length - likelyN - reviewN;
  const section = (s: MatchStatus) => shown.filter((r) => r.result.status === s);
  const fill = (tpl: string, v: Record<string, string | number>) => tpl.replace(/\{(\w+)\}/g, (_, k) => String(v[k] ?? ""));

  const card = ({ listing, result }: Row) => {
    const q = result.quality;
    const warnings = (q?.warnings ?? []).filter((w) => w !== "not_manually_verified") as Exclude<QualityWarning, "not_manually_verified">[];
    const showWarnings = result.status !== "UNLIKELY_MATCH" && warnings.length > 0;
    const showUnits = (q?.warnings.includes("household_size_unpublished") || q?.warnings.includes("unit_pairing_unpublished")) && (q?.unitsListed.length ?? 0) > 0;
    const days = q?.daysToDeadline;
    const closing =
      q?.closingSoon && days != null ? (days === 0 ? t.closesToday : days === 1 ? t.closesTomorrow : fill(t.closesInDays, { n: days })) : null;
    const collected = listing.collectedAt?.slice(0, 10);
    return (
      <li key={listing.id} data-testid={`result-${listing.id}`} className="rounded-2xl border border-stone-200 bg-white p-5">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={result.status} label={t[result.status]} />
          {closing && (
            <span data-testid="closing-soon" className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-800 ring-1 ring-inset ring-red-700/20">
              {closing}
            </span>
          )}
          {!result.matchesPreferences && <span className="text-xs text-stone-500">{t.outsidePrefs}</span>}
          {listing.listingType && listing.listingType !== "lottery" && (
            <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs text-indigo-800">{t[`type_${listing.listingType}`]}</span>
          )}
          {listing.isSample && <span className="rounded bg-violet-50 px-1.5 py-0.5 text-xs text-violet-800">{t.sample}</span>}
        </div>
        <h4 className="mt-2 text-lg font-semibold text-stone-900">{listing.projectName}</h4>
        <p className="text-sm text-stone-600">
          {listing.borough ? boroughLabel[lang][listing.borough] : "—"}
          {listing.unitTypes.length > 0 && " · " + listing.unitTypes.map((u) => unitLabel[lang][u]).join(", ")}
          {listing.applicationDeadline && ` · ${t.deadline}: ${listing.applicationDeadline}`}
        </p>

        {q && q.fits.length > 0 && (
          <p data-testid="fits" className="mt-2 text-sm text-teal-900">
            {t.fitsLabel}{lang === "en" ? " " : ""}
            {q.fits
              .map((f) => `${f.unitTypes.length ? f.unitTypes.map((u) => unitLabel[lang][u]).join("/") : t.anyUnit}${f.amiPercent != null ? ` (${f.amiPercent}% AMI)` : ""}`)
              .join(", ")}
          </p>
        )}

        {showWarnings && (
          <div data-testid="quality-warnings" className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-950">
            <ul className="space-y-1">
              {warnings.map((w) => (
                <li key={w} data-warning={w} className="flex gap-2">
                  <span aria-hidden>⚠</span>
                  {t[`q_${w}`]}
                </li>
              ))}
            </ul>
            {showUnits && (
              <p className="mt-1 text-amber-900">
                {t.unitsListed}{lang === "en" ? " " : ""}{q!.unitsListed.map((u) => unitLabel[lang][u]).join(", ")}
              </p>
            )}
            {result.status === "NEEDS_REVIEW" && <p className="mt-1 font-medium">{t.q_confirm}</p>}
          </div>
        )}

        <details
          className="mt-3 text-sm"
          onToggle={(e) => {
            if (e.currentTarget.open) onDetailsOpen?.(listing.id);
          }}
        >
          <summary className="cursor-pointer font-medium text-teal-800">{t.why}</summary>
          <ul className="mt-2 space-y-1.5">
            {result.outcomes.map((o) => (
              <li key={o.rule} data-outcome={o.result} className="flex gap-2 text-stone-700">
                <span aria-hidden className={o.result === "pass" ? "text-teal-700" : o.result === "fail" ? "text-stone-400" : "text-amber-600"}>
                  {o.result === "pass" ? "✓" : o.result === "fail" ? "✕" : "?"}
                </span>
                {o.reason[lang]}
              </li>
            ))}
          </ul>
        </details>

        {listing.sourceName && (
          <p data-testid="provenance" className="mt-3 text-xs text-stone-500">
            {listing.dataSource === "muse" ? t.autoCollected : t.source}: {listing.sourceName}
            {listing.lastVerifiedAt ? ` · ${t.checked} ${listing.lastVerifiedAt}` : ` · ${t.q_not_manually_verified}`}
            {listing.dataSource === "muse" && collected && ` · ${fill(t.collectedAuto, { d: collected })}`}
          </p>
        )}
        {listing.applicationUrl && (
          <a
            href={listing.applicationUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => onOfficialLinkClick?.(listing.id)}
            onAuxClick={(e) => {
              if (e.button === 1) onOfficialLinkClick?.(listing.id);
            }}
            className="mt-3 inline-block text-sm font-semibold text-teal-800 underline underline-offset-4"
          >
            {t.officialLink} ↗
          </a>
        )}
      </li>
    );
  };

  const block = (s: MatchStatus, title: string | null, note: string | null) => {
    const items = section(s);
    if (items.length === 0) return null;
    return (
      <section key={s} data-testid={`section-${s}`} aria-labelledby={`h-${s}`} className="mb-8">
        {title && (
          <h3 id={`h-${s}`} className="text-base font-semibold text-stone-900">
            {title} <span className="font-normal text-stone-500">({items.length})</span>
          </h3>
        )}
        {note && <p className="mt-1 mb-3 text-sm text-stone-600">{note}</p>}
        <ul className="space-y-4">{items.map(card)}</ul>
      </section>
    );
  };

  return (
    <>
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-xl font-semibold text-stone-900">{t.results}</h2>
        {hiddenN > 0 || showUnlikely ? (
          <label className="flex items-center gap-2 text-sm text-stone-600">
            <input type="checkbox" checked={showUnlikely} onChange={(e) => setShowUnlikely(e.target.checked)} className="accent-teal-800" />
            {t.showUnlikely} ({hiddenN || ""})
          </label>
        ) : null}
      </div>
      <p data-testid="result-counts" className="mb-3 text-sm text-stone-700">
        {fill(t.counts, { likely: likelyN, review: reviewN, hidden: hiddenN })}
      </p>
      <p className="mb-6 rounded-lg bg-stone-100 px-4 py-2.5 text-sm text-stone-700">{t.disclaimerShort}</p>
      {shown.length === 0 && <p className="text-stone-500">{t.noResults}</p>}
      {block("LIKELY_MATCH", t.sectionLikely, t.sectionLikelyNote)}
      {block("NEEDS_REVIEW", t.sectionReview, t.sectionReviewNote)}
      {block("UNLIKELY_MATCH", t.UNLIKELY_MATCH, null)}
    </>
  );
}
