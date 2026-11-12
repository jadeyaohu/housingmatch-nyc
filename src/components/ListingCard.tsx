import { DemoSaveButton } from "./preview/DemoSaveButton";
import Link from "next/link";
import type { Listing } from "@/lib/types";
import { dict, boroughLabel, unitLabel, type Lang } from "@/lib/i18n";
import { availabilityOf, listingTypeOf } from "@/lib/availability";
import { safeProviderURL } from "@/lib/directory/search";
import { AvailabilityBadge } from "./AvailabilityBadge";
import { ListingMedia } from "./ListingMedia";
export function ListingCard({ listing: l, lang, today, demo=false, saveControl }: { listing: Listing; lang: Lang; today: string; demo?: boolean; saveControl?: React.ReactNode }) {
  const t = dict[lang], type = listingTypeOf(l), av = availabilityOf(l,today);
  const rents = l.incomeBands.map(b=>b.monthlyRent).filter((n):n is number=>n!=null);
  const url = safeProviderURL(l.applicationUrl);
  const verifiedHost = url && new URL(url).hostname === "housingconnect.nyc.gov";
  const date = (l.collectedAt ?? l.lastVerifiedAt)?.slice(0,10);
  return <li data-testid="directory-card" data-listing-type={type} className="flex min-w-0 flex-col overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-sm">
    <ListingMedia lang={lang}/>
    <div className="flex flex-1 flex-col p-5">
      <div className="flex flex-wrap items-center gap-2 text-xs"><AvailabilityBadge value={av} lang={lang} date={date}/><span className="rounded-full bg-stone-100 px-2 py-1">{t[`type_${type}`]}</span>{l.isSample && <span className="rounded-full bg-amber-50 px-2 py-1 text-amber-900">{t.sample}</span>}</div>
      <h2 className="mt-4 text-xl font-semibold leading-snug"><Link href={`/listings/${encodeURIComponent(l.id)}`} className="hover:text-teal-800 hover:underline">{l.projectName}</Link></h2>
      {saveControl ?? (demo && <DemoSaveButton id={l.id} lang={lang}/>)}
      <p className="mt-2 text-sm text-stone-600">{l.borough ? boroughLabel[lang][l.borough] : t.notListed}{l.address ? ` · ${l.address}` : ""}</p>
      <dl className="mt-4 grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2 text-sm">
        <dt className="text-stone-500">{t.rent}</dt><dd className="font-semibold">{rents.length ? `$${Math.min(...rents).toLocaleString("en-US")}` : t.notListed}</dd>
        <dt className="text-stone-500">{t.units}</dt><dd>{l.unitTypes.map(u=>unitLabel[lang][u]).join(", ") || t.notListed}</dd>
        <dt className="text-stone-500">{t.deadline}</dt><dd>{l.applicationDeadline ?? (type === "lottery" ? t.notListed : t.rolling)}</dd>
      </dl>
      <p className="mt-4 text-xs leading-relaxed text-stone-500">{t.source}: {l.sourceName ?? t.notListed} · {date ? `${t.checked} ${date}` : t.notVerified}</p>
      <p className="mt-3 text-xs leading-relaxed text-stone-600">{t.disclaimerShort}</p>
      {url && <a href={url} target="_blank" rel="noopener noreferrer" className="mt-auto pt-5 text-sm font-semibold text-teal-800 underline underline-offset-4">{verifiedHost ? t.apply : (lang === "zh" ? "提供方链接（来源需核实）" : "Provider link (verify source)")} ↗<span className="sr-only"> {t.opensNewTab}</span></a>}
    </div>
  </li>;
}
