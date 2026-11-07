"use client";
import { useRef, useState } from "react";
import { BOROUGHS, UNIT_TYPES, type Borough, type Listing, type MatchResult, type UnitType } from "@/lib/types";
import { boroughLabel, dict, unitLabel, type Lang } from "@/lib/i18n";
import { StatusBadge } from "./StatusBadge";
import { TrackedLink } from "./analytics/TrackedLink";
import { bucket, track, trackOncePerVisit } from "@/lib/analytics/client";

type Row = { listing: Listing; result: MatchResult };

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={`rounded-full border px-3 py-1.5 text-sm transition ${
        on ? "border-teal-800 bg-teal-800 text-white" : "border-stone-300 bg-white text-stone-700 hover:border-stone-500"
      }`}
    >
      {children}
    </button>
  );
}

export function Matcher({ lang }: { lang: Lang }) {
  const t = dict[lang];
  const [size, setSize] = useState(2);
  const [income, setIncome] = useState("");
  const [boroughs, setBoroughs] = useState<Borough[]>([]);
  const [bedrooms, setBedrooms] = useState<UnitType[]>([]);
  const [voucher, setVoucher] = useState(false);
  const [senior, setSenior] = useState(false);
  const [disability, setDisability] = useState(false);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [showUnlikely, setShowUnlikely] = useState(false);

  // Analytics (HN-001 PR1b): anonymous; matcher inputs are never part of any event.
  const startedRef = useRef(false);
  const openedRef = useRef(new Set<string>());
  const markStarted = () => {
    if (startedRef.current) return;
    startedRef.current = true;
    trackOncePerVisit("matcher_started", {}, lang);
  };

  const toggle = <T,>(arr: T[], v: T, set: (x: T[]) => void) => set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(false);
    try {
      const res = await fetch("/api/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          size,
          annualIncome: Math.round(Number(income.replace(/[^\d.]/g, "")) || 0),
          boroughs,
          bedrooms,
          hasVoucher: voucher,
          hasMember62Plus: senior,
          hasMember55Plus: senior,
          hasDisability: disability,
        }),
      });
      if (!res.ok) throw new Error();
      const results: unknown = (await res.json())?.results;
      // Validate before touching UI state: a malformed 200 must not reach render.
      if (!Array.isArray(results)) throw new Error("malformed_match_response");
      const typed = results as Row[];
      setRows(typed);
      openedRef.current = new Set();
      // Counts cover ALL returned rows (incl. matchesPreferences === false), not only visible ones.
      // Definition: EventProps["matcher_completed"] in src/lib/analytics/client.ts.
      track(
        "matcher_completed",
        {
          likely_count: bucket(typed.filter((r) => r.result?.status === "LIKELY_MATCH").length),
          review_count: bucket(typed.filter((r) => r.result?.status === "NEEDS_REVIEW").length),
          has_borough_pref: boroughs.length > 0,
        },
        lang,
      );
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  const visible = rows?.filter((r) => showUnlikely || (r.result.status !== "UNLIKELY_MATCH" && r.result.matchesPreferences)) ?? [];
  const hidden = (rows?.length ?? 0) - visible.length;

  return (
    <div className="grid gap-10 lg:grid-cols-[400px_1fr]">
      <form onSubmit={submit} onChangeCapture={markStarted} onClickCapture={markStarted} className="h-fit space-y-6 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
        <label className="block">
          <span className="text-sm font-medium text-stone-800">{t.householdSize}</span>
          <div className="mt-2 flex items-center gap-3">
            <button type="button" aria-label="−" onClick={() => setSize(Math.max(1, size - 1))} className="h-10 w-10 rounded-lg border border-stone-300 text-lg hover:bg-stone-50">−</button>
            <span className="w-8 text-center text-xl font-semibold tabular-nums" aria-live="polite">{size}</span>
            <button type="button" aria-label="+" onClick={() => setSize(Math.min(12, size + 1))} className="h-10 w-10 rounded-lg border border-stone-300 text-lg hover:bg-stone-50">+</button>
          </div>
        </label>

        <label className="block">
          <span className="text-sm font-medium text-stone-800">{t.income}</span>
          <div className="relative mt-2">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-500">$</span>
            <input
              required
              inputMode="numeric"
              value={income}
              onChange={(e) => setIncome(e.target.value)}
              placeholder="65,000"
              className="w-full rounded-lg border border-stone-300 py-2.5 pl-7 pr-3 text-lg tabular-nums outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-700/20"
            />
          </div>
        </label>

        <fieldset>
          <legend className="text-sm font-medium text-stone-800">
            {t.boroughs} <span className="font-normal text-stone-500">· {t.anyHint}</span>
          </legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {BOROUGHS.map((b) => (
              <Chip key={b} on={boroughs.includes(b)} onClick={() => toggle(boroughs, b, setBoroughs)}>{boroughLabel[lang][b]}</Chip>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="text-sm font-medium text-stone-800">
            {t.bedrooms} <span className="font-normal text-stone-500">· {t.anyHint}</span>
          </legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {UNIT_TYPES.map((u) => (
              <Chip key={u} on={bedrooms.includes(u)} onClick={() => toggle(bedrooms, u, setBedrooms)}>{unitLabel[lang][u]}</Chip>
            ))}
          </div>
        </fieldset>

        <div className="space-y-3 text-sm text-stone-700">
          {[
            [voucher, setVoucher, t.voucher],
            [senior, setSenior, t.senior62],
            [disability, setDisability, t.disability],
          ].map(([v, set, label], i) => (
            <label key={i} className="flex items-start gap-3">
              <input type="checkbox" checked={v as boolean} onChange={(e) => (set as (b: boolean) => void)(e.target.checked)} className="mt-0.5 h-4 w-4 accent-teal-800" />
              <span>{label as string}</span>
            </label>
          ))}
        </div>

        <button disabled={loading} className="w-full rounded-xl bg-teal-800 py-3 font-semibold text-white transition hover:bg-teal-900 disabled:opacity-60">
          {loading ? t.loading : t.cta}
        </button>
        <p className="text-center text-xs text-stone-500">{t.noAccount}</p>
      </form>

      <section aria-live="polite">
        {error && <p className="rounded-lg bg-red-50 p-4 text-sm text-red-800">{t.error}</p>}
        {rows && (
          <>
            <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-xl font-semibold text-stone-900">{t.results}</h2>
              {hidden > 0 || showUnlikely ? (
                <label className="flex items-center gap-2 text-sm text-stone-600">
                  <input type="checkbox" checked={showUnlikely} onChange={(e) => setShowUnlikely(e.target.checked)} className="accent-teal-800" />
                  {t.showUnlikely} ({hidden || ""})
                </label>
              ) : null}
            </div>
            <p className="mb-4 rounded-lg bg-stone-100 px-4 py-2.5 text-sm text-stone-700">{t.disclaimerShort}</p>
            {visible.length === 0 && <p className="text-stone-500">{t.noResults}</p>}
            <ul className="space-y-4">
              {visible.map(({ listing, result }) => (
                <li key={listing.id} className="rounded-2xl border border-stone-200 bg-white p-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={result.status} label={t[result.status]} />
                    {!result.matchesPreferences && <span className="text-xs text-stone-500">{t.outsidePrefs}</span>}
                    {listing.listingType && listing.listingType !== "lottery" && (
                      <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs text-indigo-800">{t[`type_${listing.listingType}`]}</span>
                    )}
                    {listing.isSample && <span className="rounded bg-violet-50 px-1.5 py-0.5 text-xs text-violet-800">{t.sample}</span>}
                  </div>
                  <h3 className="mt-2 text-lg font-semibold text-stone-900">{listing.projectName}</h3>
                  <p className="text-sm text-stone-600">
                    {listing.borough ? boroughLabel[lang][listing.borough] : "—"}
                    {listing.unitTypes.length > 0 && " · " + listing.unitTypes.map((u) => unitLabel[lang][u]).join(", ")}
                    {listing.applicationDeadline && ` · ${t.deadline}: ${listing.applicationDeadline}`}
                  </p>
                  <details
                    className="mt-3 text-sm"
                    onToggle={(e) => {
                      if (e.currentTarget.open && !openedRef.current.has(listing.id)) {
                        openedRef.current.add(listing.id);
                        track("listing_details_opened", { listing_id: listing.id }, lang);
                      }
                    }}
                  >
                    <summary className="cursor-pointer font-medium text-teal-800">{t.why}</summary>
                    <ul className="mt-2 space-y-1.5">
                      {result.outcomes.map((o) => (
                        <li key={o.rule} className="flex gap-2 text-stone-700">
                          <span aria-hidden className={o.result === "pass" ? "text-teal-700" : o.result === "fail" ? "text-stone-400" : "text-amber-600"}>
                            {o.result === "pass" ? "✓" : o.result === "fail" ? "✕" : "?"}
                          </span>
                          {o.reason[lang]}
                        </li>
                      ))}
                    </ul>
                  </details>
                  {listing.sourceName && (
                    <p className="mt-3 text-xs text-stone-500">
                      {listing.dataSource === "muse" ? t.autoCollected : t.source}: {listing.sourceName}
                      {listing.lastVerifiedAt && ` · ${t.checked} ${listing.lastVerifiedAt}`}
                    </p>
                  )}
                  {listing.applicationUrl && (
                    <TrackedLink href={listing.applicationUrl} listingId={listing.id} from="results" lang={lang} className="mt-3 inline-block text-sm font-semibold text-teal-800 underline underline-offset-4">
                      {t.apply} ↗
                    </TrackedLink>
                  )}
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    </div>
  );
}
