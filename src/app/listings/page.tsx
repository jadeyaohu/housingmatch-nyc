import Link from "next/link";
import { BOROUGHS, UNIT_TYPES } from "@/lib/types";
import { boroughLabel, dict, unitLabel } from "@/lib/i18n";
import { getLang } from "@/lib/lang";
import { getListings, todayNY } from "@/lib/data/listings";
import { directoryListings, directoryParams } from "@/lib/directory/search";
import { parseUnitTypes } from "@/lib/import/normalize";
import { ListingCard } from "@/components/ListingCard";
type SP = Promise<Record<string, string | string[] | undefined>>;
export default async function ListingsPage({ searchParams }: { searchParams: SP }) {
  const sp = directoryParams(await searchParams), lang = await getLang(), t = dict[lang], today = todayNY();
  const listings = directoryListings(await getListings(),sp,today);
  const secondary = sp.type === "rerental" || sp.type === "waitlist";
  const select = "min-h-11 w-full min-w-0 rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm";
  return <>
    <header className="max-w-3xl"><p className="text-xs font-bold tracking-widest text-teal-800">{lang === "zh" ? "免费住房搜索" : "FREE HOUSING DISCOVERY"}</p><h1 className="mt-3 text-4xl font-bold tracking-tight">{t.navListings}</h1><p className="mt-4 leading-relaxed text-stone-600">{lang === "zh" ? "浏览房源，核对家庭收入要求，并通过官方渠道免费申请。" : "Explore opportunities, check household income requirements and apply free through official providers."}</p></header>
    <form className="mt-7 grid grid-cols-2 gap-3 rounded-2xl border border-stone-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-6" aria-label={t.filters}>
      <label className="col-span-2 text-xs font-medium">{lang === "zh" ? "搜索名称、地址或区" : "Search name, address or borough"}<input name="q" type="search" maxLength={120} defaultValue={(sp.q??"").slice(0,120)} className={`${select} mt-1`}/></label>
      <label className="text-xs font-medium">{t.borough}<select name="borough" defaultValue={sp.borough??""} className={`${select} mt-1`}><option value="">{t.any}</option>{BOROUGHS.map(b=><option key={b} value={b}>{boroughLabel[lang][b]}</option>)}</select></label>
      <label className="text-xs font-medium">{t.units}<select name="unit" defaultValue={sp.unit ? parseUnitTypes(sp.unit)[0]??"" : ""} className={`${select} mt-1`}><option value="">{t.any}</option>{UNIT_TYPES.map(u=><option key={u} value={u}>{unitLabel[lang][u]}</option>)}</select></label>
      <label className="text-xs font-medium">{t.type}<select name="type" defaultValue={secondary?sp.type:"lottery"} className={`${select} mt-1`}>{(["lottery","rerental","waitlist"] as const).map(type=><option key={type} value={type}>{t[`type_${type}`]}</option>)}</select></label>
      <button className="mt-auto min-h-11 rounded-xl bg-teal-800 px-4 py-2 font-semibold text-white">{t.apply_filters}</button>
    </form>
    {secondary ? <aside data-testid="rerental-banner" className="mt-6 rounded-xl border border-dashed border-indigo-300 bg-indigo-50 p-4 text-sm"><p className="font-semibold">{t.rr_heading}</p><ul className="mt-2 space-y-1">{[t.rr_note1,t.rr_note2,t.rr_note3].map(n=><li key={n}>{n}</li>)}</ul></aside> : <p className="mt-5 text-sm text-stone-600">{t.browseLotteriesOnly} <Link href="/listings?type=rerental" className="text-teal-800 underline">{t.browseRerentals}</Link></p>}
    <p data-testid="listing-count" className="mt-5 text-sm font-medium">{t.showingCount.replace("{n}",String(listings.length))}</p>
    {!listings.length && <p className="mt-8">{t.noResults}</p>}
    <ul className="mt-5 grid items-stretch gap-6 md:grid-cols-2 xl:grid-cols-3">{listings.map(l=><ListingCard key={l.id} listing={l} lang={lang} today={today}/>)}</ul>
  </>;
}
