"use client";
import { useState } from "react";
import type { Listing, MatchResult, MatchStatus } from "@/lib/types";
import { boroughLabel, dict, unitLabel, type Lang } from "@/lib/i18n";
import type { QualityWarning } from "@/lib/matching/quality";
import { StatusBadge } from "./StatusBadge";
import { AvailabilityBadge } from "./AvailabilityBadge";
import type { Availability } from "@/lib/availability";
import type { LifestyleFit } from "@/lib/lifestyle";
import { districtsLabel, type PriorityItem } from "@/lib/priority";

export type Row = { listing: Listing; result: MatchResult; availability?: Availability; lifestyle?: LifestyleFit; priority?: PriorityItem[] };

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
  variant = "main",
}: {
  rows: Row[];
  lang: Lang;
  /** "secondary" = inside the re-rental box: no page-level heading, unique ids, provider-neutral copy. */
  variant?: "main" | "secondary";
  onDetailsOpen?: (listingId: string) => void;
  onOfficialLinkClick?: (listingId: string) => void;
}) {
  const t = dict[lang];
  const secondary = variant === "secondary";
  const idp = secondary ? "rr-" : "";
  const [showUnlikely, setShowUnlikely] = useState(false);
  // Long lists are hard to scroll on a phone: show the first PAGE per section, then "Show more".
  const PAGE = 10;
  const [limit, setLimit] = useState<Record<string, number>>({});

  const shown = rows.filter((r) => showUnlikely || (r.result.status !== "UNLIKELY_MATCH" && r.result.matchesPreferences));
  const inPrefs = (s: MatchStatus) => rows.filter((r) => r.result.matchesPreferences && r.result.status === s).length;
  const likelyN = inPrefs("LIKELY_MATCH");
  const reviewN = inPrefs("NEEDS_REVIEW");
  const hiddenN = rows.length - likelyN - reviewN;
  const section = (s: MatchStatus) => shown.filter((r) => r.result.status === s);
  const fill = (tpl: string, v: Record<string, string | number>) => tpl.replace(/\{(\w+)\}/g, (_, k) => String(v[k] ?? ""));
  const linkLabel = (l: Listing) => {
    if (isHousingConnect(l) || !l.sourceName) return t.officialLink; // Housing Connect page with the income chart
    return isGenericUrl(l.applicationUrl) ? fill(t.searchLinkSrc, { source: l.sourceName }) : fill(t.officialLinkSrc, { source: l.sourceName });
  };

  const card = ({ listing, result, availability, lifestyle, priority }: Row) => {
    const q = result.quality;
    const warnings = (q?.warnings ?? []).filter((w) => w !== "not_manually_verified") as Exclude<QualityWarning, "not_manually_verified">[];
    const review = result.status === "NEEDS_REVIEW";
    // Rules whose uncertainty the quality warnings already explain (when quality is present).
    const covered = new Set(q ? ["income", "household_size"] : []);
    // Engine-authored, bilingual reasons for the remaining `unknown` rules (e.g. restrictions,
    // deadline). Never user inputs; never new requirements.
    const otherUnknown = review ? result.outcomes.filter((o) => o.result === "unknown" && !covered.has(o.rule)) : [];
    // Every NEEDS_REVIEW card gets the box (with the confirmation line), even with no quality
    // warnings or no `quality` at all. LIKELY cards show it only if there are warnings.
    const showWarnings = review || (result.status === "LIKELY_MATCH" && warnings.length > 0);
    const showUnits = (q?.warnings.includes("household_size_unpublished") || q?.warnings.includes("unit_pairing_unpublished")) && (q?.unitsListed.length ?? 0) > 0;
    const days = q?.daysToDeadline;
    const closing =
      q?.closingSoon && days != null ? (days === 0 ? t.closesToday : days === 1 ? t.closesTomorrow : fill(t.closesInDays, { n: days })) : null;
    const collected = listing.collectedAt?.slice(0, 10);
    return (
      <li key={listing.id} data-testid={`result-${listing.id}`} className="rounded-2xl border border-stone-200 bg-white p-5">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={result.status} label={t[result.status]} />
          {availability && availability !== "verified_open" ? <AvailabilityBadge value={availability} lang={lang} date={collected} /> : null}
          {availability === "verified_open" && listing.listingType && listing.listingType !== "lottery" ? <AvailabilityBadge value={availability} lang={lang} date={collected} /> : null}
          {closing && (
            <span data-testid="closing-soon" className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-800 ring-1 ring-inset ring-red-700/20">
              {closing}
            </span>
          )}
          {!result.matchesPreferences && <span className="text-xs text-stone-500">{t.outsidePrefs}</span>}
          {lifestyle?.budget && (
            <span data-budget={lifestyle.budget} className={`rounded-full px-2 py-0.5 text-xs ring-1 ring-inset ${lifestyle.budget === "yes" ? "bg-teal-50 text-teal-900 ring-teal-700/20" : lifestyle.budget === "no" ? "bg-rose-50 text-rose-900 ring-rose-700/20" : "bg-stone-100 text-stone-600 ring-stone-400/30"}`}>
              {t[`budget_${lifestyle.budget}`]}
              {lifestyle.rentFrom != null ? ` · $${lifestyle.rentFrom.toLocaleString("en-US")}+` : ""}
            </span>
          )}
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

        {priority && priority.length > 0 && (
          <div data-testid="priority" className="mt-3 rounded-lg bg-sky-50 px-3 py-2 text-sm text-sky-950">
            <p className="font-medium">{t.pr_title}</p>
            <ul className="mt-1 space-y-1">
              {priority.map((p) => {
                const district = districtsLabel(p.districts ?? (p.district ? [p.district] : []), lang);
                const main =
                  p.kind === "community"
                    ? district ? fill(t.pr_community, { pct: p.pct, district }) : fill(t.pr_community_any, { pct: p.pct })
                    : fill(t[`pr_${p.kind}`], { pct: p.pct });
                const sub =
                  p.kind === "community" ? t[`pr_community_${p.fit}`] : p.fit === "yes" ? t.pr_yes_you : null;
                return (
                  <li key={p.kind} data-priority={p.kind} data-fit={p.fit} className={`flex gap-2 ${p.fit === "no" ? "text-sky-900/60" : ""}`}>
                    <span aria-hidden>{p.fit === "yes" ? "✓" : "•"}</span>
                    <span>{main}{sub ? <span className="text-sky-900/80"> — {sub}</span> : null}</span>
                  </li>
                );
              })}
            </ul>
            <p className="mt-1 text-xs text-sky-900/70">{t.pr_note}</p>
          </div>
        )}

        {showWarnings && (
          <div data-testid="quality-warnings" className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-950">
            <ul className="space-y-1" hidden={warnings.length === 0}>
              {warnings.map((w) => (
                <li key={w} data-warning={w} className="flex gap-2">
                  <span aria-hidden>⚠</span>
                  {t[`q_${w}`]}
                </li>
              ))}
            </ul>
            {otherUnknown.length > 0 && (
              <ul data-testid="unknown-reasons" className="space-y-1">
                {otherUnknown.map((o) => (
                  <li key={o.rule} data-unknown-rule={o.rule} className="flex gap-2">
                    <span aria-hidden>?</span>
                    {o.reason[lang]}
                  </li>
                ))}
              </ul>
            )}
            {showUnits && (
              <p className="mt-1 text-amber-900">
                {t.unitsListed}{lang === "en" ? " " : ""}{q!.unitsListed.map((u) => unitLabel[lang][u]).join(", ")}
              </p>
            )}
            {review && (
              <p data-testid="review-confirm" className="mt-1 font-medium">
                {isHousingConnect(listing) ? t.q_confirm : listing.sourceName ? fill(t.q_confirm_src, { source: listing.sourceName }) : t.q_confirm_any}
              </p>
            )}
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
            {/* Automated collection is not manual verification, so Muse data is always labelled as such. */}
            {listing.dataSource === "muse"
              ? `${t.autoCollected}: ${listing.sourceName}${collected ? ` · ${collected}` : ""} · ${t.notManuallyVerifiedShort}`
              : `${t.source}: ${listing.sourceName}${listing.lastVerifiedAt ? ` · ${t.checked} ${listing.lastVerifiedAt}` : ` · ${t.notManuallyVerifiedShort}`}`}
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
            {linkLabel(listing)} ↗<span className="sr-only"> {t.opensNewTab}</span>
          </a>
        )}
      </li>
    );
  };

  const block = (s: MatchStatus, title: string | null, note: string | null) => {
    const items = section(s);
    if (items.length === 0) return null;
    return (
      <section key={s} data-testid={`${idp}section-${s}`} aria-labelledby={title ? `${idp}h-${s}` : undefined} className="mb-8">
        {title && (
          <h3 id={`${idp}h-${s}`} className="text-base font-semibold text-stone-900">
            {title} <span className="font-normal text-stone-500">({items.length})</span>
          </h3>
        )}
        {note && <p className="mt-1 mb-3 text-sm text-stone-600">{note}</p>}
        <ul className="space-y-4">{items.slice(0, limit[s] ?? PAGE).map(card)}</ul>
        {items.length > (limit[s] ?? PAGE) && (
          <button
            type="button"
            data-testid={`${idp}more-${s}`}
            onClick={() => setLimit((m) => ({ ...m, [s]: (m[s] ?? PAGE) + PAGE * 2 }))}
            className="mt-4 min-h-12 w-full rounded-xl border border-stone-300 bg-white text-sm font-semibold text-stone-800 hover:bg-stone-50"
          >
            {fill(t.showMore, { n: Math.min(PAGE * 2, items.length - (limit[s] ?? PAGE)), left: items.length - (limit[s] ?? PAGE) })}
          </button>
        )}
      </section>
    );
  };

  return (
    <>
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
        {!secondary && <h2 className="text-xl font-semibold text-stone-900">{t.results}</h2>}
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
      {block("NEEDS_REVIEW", t.sectionReview, secondary ? t.sectionReviewNoteRr : t.sectionReviewNote)}
      {block("UNLIKELY_MATCH", t.UNLIKELY_MATCH, null)}
    </>
  );
}

function isHousingConnect(l: Listing): boolean {
  // Open Data rows are Housing Connect lotteries; Muse rows say which site they came from.
  return l.dataSource !== "muse" || l.sourceName === "Housing Connect";
}

/** A site's index/search page rather than one listing (e.g. https://prontohousingrentals.com/listings). */
export function isGenericUrl(url: string | null): boolean {
  if (!url) return false;
  try {
    const u = new URL(url);
    const parts = u.pathname.split("/").filter(Boolean);
    if (parts.length === 0) return true;
    if (/\d/.test(u.pathname)) return false;
    return parts.length === 1 && /^(listings?|rentals?|re-rentals|search|apartments|properties|availability|available-units)$/i.test(parts[0]);
  } catch {
    return false;
  }
}
