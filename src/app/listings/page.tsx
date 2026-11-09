import Link from "next/link";
import { BOROUGHS, UNIT_TYPES } from "@/lib/types";
import { boroughLabel, dict, unitLabel } from "@/lib/i18n";
import { getLang } from "@/lib/lang";
import { getListings, todayNY } from "@/lib/data/listings";
import { lifecycle, parseUnitTypes } from "@/lib/import/normalize";
import { AutoSubmitForm } from "@/components/AutoSubmitForm";
import { availabilityOf } from "@/lib/availability";
import { AvailabilityBadge } from "@/components/AvailabilityBadge";

type SP = Promise<Record<string, string | undefined>>;

export default async function ListingsPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const lang = await getLang();
  const t = dict[lang];
  const today = todayNY();
  const all = await getListings();
  const secondary = sp.type === "rerental" || sp.type === "waitlist";
  // Accept both the internal value (1br) and the visible label ("1 BR") in shared links.
  const unit = sp.unit ? parseUnitTypes(sp.unit)[0] ?? null : null;

  const listings = all
    .map((l) => ({ l, lc: lifecycle(l, today) }))
    .filter(({ l, lc }) => (!sp.borough || l.borough === sp.borough) && (!unit || l.unitTypes.includes(unit)) && (!sp.status || lc === sp.status) && (l.listingType ?? "lottery") === (sp.type || "lottery") && availabilityOf(l, today) !== "confirmed_closed")
    .sort((a, b) => (a.l.applicationDeadline ?? "9999").localeCompare(b.l.applicationDeadline ?? "9999"));

  const select = "rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm";
  const lcStyle: Record<string, string> = {
    new: "bg-teal-50 text-teal-900",
    open: "bg-teal-50 text-teal-900",
    closing_soon: "bg-amber-50 text-amber-900",
    upcoming: "bg-sky-50 text-sky-900",
    closed: "bg-stone-100 text-stone-600",
    unknown: "bg-stone-100 text-stone-600",
  };

  return (
    <>
      <h1 className="text-3xl font-bold tracking-tight">{t.navListings}</h1>
      <AutoSubmitForm className="mt-6 flex flex-wrap items-end gap-3" label={t.filters}>
        <select name="borough" defaultValue={sp.borough ?? ""} className={select} aria-label={t.boroughs}>
          <option value="">{t.boroughs}: {t.any}</option>
          {BOROUGHS.map((b) => <option key={b} value={b}>{boroughLabel[lang][b]}</option>)}
        </select>
        <select name="unit" defaultValue={unit ?? ""} className={select} aria-label={t.bedrooms}>
          <option value="">{t.bedrooms}: {t.any}</option>
          {UNIT_TYPES.map((u) => <option key={u} value={u}>{unitLabel[lang][u]}</option>)}
        </select>
        <select name="status" defaultValue={sp.status ?? ""} className={select} aria-label={t.status}>
          <option value="">{t.status}: {t.any}</option>
          {(["new", "open", "closing_soon", "upcoming"] as const).map((s) => <option key={s} value={s}>{t[`lc_${s}`]}</option>)}
        </select>
        <select name="type" defaultValue={sp.type ?? "lottery"} className={select} aria-label={t.type}>
          {(["lottery", "rerental", "waitlist"] as const).map((x) => <option key={x} value={x}>{t[`type_${x}`]}</option>)}
        </select>
        <button className="rounded-lg bg-teal-800 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-900">{t.apply_filters}</button>
      </AutoSubmitForm>

      {secondary ? (
        <div data-testid="rerental-banner" className="mt-6 rounded-2xl border border-dashed border-indigo-300 bg-indigo-50/40 p-4 text-sm text-stone-700">
          <p className="font-semibold text-stone-900">{t.rr_heading}</p>
          <ul className="mt-2 space-y-1">
            {[t.rr_note1, t.rr_note2, t.rr_note3].map((n) => (
              <li key={n} className="flex gap-2"><span aria-hidden>•</span>{n}</li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="mt-6 text-sm text-stone-600">
          {t.browseLotteriesOnly}{" "}
          <Link href="/listings?type=rerental" className="font-semibold text-indigo-800 underline underline-offset-4">{t.browseRerentals}</Link>
        </p>
      )}
      <p data-testid="listing-count" className="mt-4 text-sm font-medium text-stone-700">{t.showingCount.replace("{n}", String(listings.length))}</p>
      {listings.length === 0 && <p className="mt-8 text-stone-500">{t.noResults}</p>}
      <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {listings.map(({ l, lc }) => {
          const rents = l.incomeBands.map((b) => b.monthlyRent).filter((r): r is number => r != null);
          return (
            <li key={l.id} className="flex flex-col rounded-2xl border border-stone-200 bg-white p-5">
              <div className="flex flex-wrap gap-1.5 text-xs">
                <span className={`rounded-full px-2 py-0.5 font-medium ${lcStyle[lc]}`}>{t[`lc_${lc}`]}</span>
                {l.listingType && l.listingType !== "lottery" && <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-indigo-800">{t[`type_${l.listingType}`]}</span>}
                {secondary && <AvailabilityBadge value={availabilityOf(l, today)} lang={lang} date={(l.collectedAt ?? l.lastVerifiedAt)?.slice(0, 10)} />}
                {l.isSample && <span className="rounded-full bg-violet-50 px-2 py-0.5 text-violet-800">{t.sample}</span>}
              </div>
              <h2 className="mt-2 font-semibold leading-snug"><Link href={`/listings/${encodeURIComponent(l.id)}`} className="hover:underline">{l.projectName}</Link></h2>
              <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm text-stone-600">
                <dt className="text-stone-500">{t.borough}</dt><dd>{l.borough ? boroughLabel[lang][l.borough] : <span className="text-stone-400">{t.notListed}</span>}</dd>
                <dt className="text-stone-500">{t.units}</dt><dd>{l.unitTypes.map((u) => unitLabel[lang][u]).join(", ") || <span className="text-stone-400">{t.notListed}</span>}</dd>
                <dt className="text-stone-500">{t.rent}</dt><dd>{rents.length ? `$${Math.min(...rents).toLocaleString()}` : <span className="text-stone-400">{t.notListed}</span>}</dd>
                <dt className="text-stone-500">{t.deadline}</dt><dd>{l.applicationDeadline ? (l.applicationDeadline === today ? <strong className="text-red-800">{t.closesTodayShort}</strong> : l.applicationDeadline) : <span className="text-stone-400">{secondary ? t.rolling : t.notListed}</span>}</dd>
                <dt className="text-stone-500">{t.source}</dt><dd>{l.sourceName ?? t.notListed}{l.lastVerifiedAt ? ` · ${t.checked} ${l.lastVerifiedAt}` : ""}</dd>
              </dl>
              {l.applicationUrl && (
                <a href={l.applicationUrl} target="_blank" rel="noopener noreferrer" className="mt-auto pt-4 text-sm font-semibold text-teal-800 underline underline-offset-4">
                  {t.apply} ↗<span className="sr-only"> {t.opensNewTab}</span>
                </a>
              )}
            </li>
          );
        })}
      </ul>
    </>
  );
}
