import { ListingGallery } from "@/components/ListingGallery";
import { listingSaveState } from "@/lib/saved/server";
import { SaveButton } from "@/components/SaveButton";
import { DemoSaveButton } from "@/components/preview/DemoSaveButton";
import { previewDemoEnabled } from "@/lib/preview/config";
import { safeProviderURL } from "@/lib/directory/search";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { boroughLabel, dict, unitLabel } from "@/lib/i18n";
import { getLang } from "@/lib/lang";
import { getListings, todayNY } from "@/lib/data/listings";
import { availabilityOf } from "@/lib/availability";
import { AvailabilityBadge } from "@/components/AvailabilityBadge";
import { amiMaxIncome, AMI_TABLE_YEAR } from "@/lib/ami";
import { districtsLabel } from "@/lib/priority";
import type { IncomeBand, Listing } from "@/lib/types";

export const dynamic = "force-dynamic";

const C = {
  en: {
    back: "← All housing",
    where: "Where",
    deadline: "Applications close",
    noDeadline: "No deadline published",
    units: "Apartments and income limits",
    unitsNote: "Each row is one income group. You need to fit at least one row for your household size.",
    group: "Income group",
    sizes: "Sizes",
    sizesAll: "Sizes (whole building)",
    upTo: "Up to: ",
    rangeNote: "This group covers {min}–{max}% AMI. Units here may be set at a lower level than {max}%, with lower limits. The limits shown are for {max}%.",
    maxIncome: "Max yearly income",
    minIncome: "Min yearly income",
    household: "Household size",
    householdRange: "{min}–{max} people",
    maxIncomeEstimate: "General HPD reference maximum (estimate)",
    incomplete: "Project-specific income requirements are incomplete in our record. Do not treat general AMI references as this lottery's eligibility table; confirm the official chart.",
    rent: "Rent / month",
    count: "Units",
    est: "estimate",
    estNote: "\"estimate\" = the general HPD {y} income limit for that AMI level, not this lottery's own chart. The official chart can be different.",
    forSize: "{n} people: ${v}",
    noBands: "Our data doesn't include the income groups for this listing. Check the official page.",
    pr: "Priority groups",
    prNote: "These decide which applications are reviewed first. They don't change who is eligible.",
    prCommunity: "{pct}% for residents of {d}",
    prCommunityAny: "{pct}% for residents of the local community district",
    prNycha: "{pct}% for NYCHA residents",
    prMuni: "{pct}% for NYC city employees and veterans",
    setAside: "Set aside for households that need accessible units: {list}. These are reserved units, not a priority order.",
    mob: "{pct}% mobility",
    vis: "{pct}% vision/hearing",
    notes: "Other notes from the source",
    source: "Source",
    checked: "last checked",
    notVerified: "Collected automatically — not checked by a person.",
    official: "Open the official listing",
    officialHc: "Open on Housing Connect (official chart and how to apply)",
    check: "Check if I might qualify",
    disclaimer: "HousingMatch doesn't run lotteries or accept applications. Always confirm details on the official listing.",
  },
  zh: {
    back: "← 全部房源",
    where: "位置",
    deadline: "申请截止",
    noDeadline: "没有公布截止日期",
    units: "户型和收入要求",
    unitsNote: "每一行是一个收入组。按你的家庭人数，至少要符合其中一行。",
    group: "收入组",
    sizes: "户型",
    sizesAll: "户型（整栋楼）",
    upTo: "最高：",
    rangeNote: "这个收入组覆盖 {min}–{max}% AMI。组里的单位可能定在比 {max}% 更低的等级，收入上限也会更低。这里显示的是 {max}% 的上限。",
    maxIncome: "年收入上限",
    minIncome: "最低年收入",
    household: "家庭人数",
    householdRange: "{min}–{max} 人",
    maxIncomeEstimate: "HPD 一般参考上限（估算）",
    incomplete: "记录中的项目具体收入要求不完整。请勿把一般 AMI 参考值当作该项目的资格表，请核实官方收入表。",
    rent: "月租",
    count: "套数",
    est: "估算",
    estNote: "“估算”= HPD {y} 年对应 AMI 等级的一般收入上限，不是这个抽签自己的收入表。官方收入表可能不同。",
    forSize: "{n} 人：${v}",
    noBands: "我们的数据里没有这个房源的收入分组，请查看官方页面。",
    pr: "优先组",
    prNote: "优先组决定哪些申请先被审核，不改变谁符合资格。",
    prCommunity: "{pct}% 给{d}的居民",
    prCommunityAny: "{pct}% 给本社区区的居民",
    prNycha: "{pct}% 给 NYCHA 公房住户",
    prMuni: "{pct}% 给纽约市政府雇员和退伍军人",
    setAside: "为需要无障碍单位的家庭保留：{list}。这是专门保留的单位，不是审核顺序。",
    mob: "{pct}% 行动障碍",
    vis: "{pct}% 视力/听力障碍",
    notes: "来源上的其他说明",
    source: "来源",
    checked: "最近核对",
    notVerified: "自动收集，未经人工核实。",
    official: "打开官方房源页面",
    officialHc: "在 Housing Connect 打开（官方收入表和申请方式）",
    check: "看看我可能符合吗",
    disclaimer: "HousingMatch 不举办抽签，也不接受申请。请以官方页面为准。",
  },
} as const;

const CAT_ZH: Record<string, string> = {
  "Extremely Low Income": "极低收入",
  "Very Low Income": "很低收入",
  "Low Income": "低收入",
  "Moderate Income": "中等收入",
  "Middle Income": "中高收入",
  "Above Middle Income": "高于中高收入",
};

const fill = (s: string, v: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (_, k) => String(v[k] ?? ""));
const money = (n: number) => n.toLocaleString("en-US");

async function find(id: string): Promise<Listing | undefined> {
  return (await getListings()).find((l) => l.id === decodeURIComponent(id));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const l = await find((await params).id);
  return { title: l ? `${l.projectName} · HousingMatch NYC` : "HousingMatch NYC" };
}

function incomeCell(b: IncomeBand, t: (typeof C)["en" | "zh"]) {
  if (b.maxIncomeByHouseholdSize && Object.keys(b.maxIncomeByHouseholdSize).length) {
    const e = Object.entries(b.maxIncomeByHouseholdSize).sort(([a], [c]) => Number(a) - Number(c));
    return <span>{e.map(([n, v]) => fill(t.forSize, { n, v: money(v) })).join(" · ")}</span>;
  }
  if (b.amiPercent != null) {
    const v = [1, 2, 3, 4].map((n) => [n, amiMaxIncome(b.amiPercent!, n)] as const).filter(([, v]) => v != null);
    if (v.length)
      return (
        <span>
          {b.amiMinPercent != null ? t.upTo : ""}{v.map(([n, x]) => fill(t.forSize, { n, v: money(x!) })).join(" · ")}{" "}
          <span className="rounded bg-amber-50 px-1 text-xs text-amber-900">{t.est}</span>
        </span>
      );
  }
  return <span className="text-stone-400">—</span>;
}

function incompleteRequirements(b: IncomeBand, l: Listing): boolean {
  if (b.minIncome == null || b.householdSizeMin == null || b.householdSizeMax == null) return true;
  if (!Number.isInteger(b.householdSizeMin) || !Number.isInteger(b.householdSizeMax) ||
    b.householdSizeMin < 1 || b.householdSizeMax > 12 || b.householdSizeMin > b.householdSizeMax) return true;
  for (let size = b.householdSizeMin; size <= b.householdSizeMax; size++) {
    if (b.maxIncomeByHouseholdSize?.[String(size)] == null) return true;
  }
  return b.unitTypes.length === 0 && l.unitTypes.length !== 1;
}

export default async function ListingDetail({ params }: { params: Promise<{ id: string }> }) {
  const l = await find((await params).id);
  if (!l) notFound();
  const lang = await getLang();
  const saved=await listingSaveState();
  const t = C[lang];
  const d = dict[lang];
  const today = todayNY();
  const av = availabilityOf(l, today);
  const isHc = l.dataSource !== "muse" || l.sourceName === "Housing Connect";
  const anyEstimate = l.incomeBands.some((b) => !(b.maxIncomeByHouseholdSize && Object.keys(b.maxIncomeByHouseholdSize).length) && b.amiPercent != null);
  const p = l.preferences;
  const districts = p?.communityDistricts?.length ? p.communityDistricts : p?.communityDistrict ? [p.communityDistrict] : [];
  const checked = (l.collectedAt ?? l.lastVerifiedAt)?.slice(0, 10);

  return (
    <article data-testid="listing-detail" className="mx-auto max-w-3xl">
      <Link href="/listings" className="inline-flex min-h-11 items-center text-sm font-medium text-teal-800">{t.back}</Link>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
        <span className="rounded-full bg-stone-100 px-2 py-0.5 text-stone-700">{d[`type_${l.listingType ?? "lottery"}`]}</span>
        <AvailabilityBadge value={av} lang={lang} date={checked} />
      </div>
      <ListingGallery lang={lang} listingId={l.id}/>
      <h1 className="mt-2 text-2xl font-bold tracking-tight text-stone-900 sm:text-3xl">{l.projectName}</h1>{saved?<SaveButton cfg={saved.cfg} listingId={l.id} initial={saved.ids.has(l.id)} lang={lang}/>:previewDemoEnabled()&&<DemoSaveButton id={l.id} lang={lang}/>}
      <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
        <dt className="text-stone-500">{t.where}</dt>
        <dd className="text-stone-900">{[l.borough ? boroughLabel[lang][l.borough] : null, l.address].filter(Boolean).join(" · ") || d.notListed}</dd>
        <dt className="text-stone-500">{t.deadline}</dt>
        <dd className="text-stone-900">{l.applicationDeadline ?? t.noDeadline}</dd>
      </dl>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">{t.units}</h2>
        {l.incomeBands.length === 0 ? (
          <p className="mt-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-950">{t.noBands}</p>
        ) : (
          <>
            <p className="mt-1 text-sm text-stone-600">{t.unitsNote}</p>
            <ul data-testid="income-bands" className="mt-3 space-y-3">
              {l.incomeBands.map((b, i) => (
                <li key={i} className="rounded-xl border border-stone-200 bg-white p-4 text-sm">
                  <p className="font-semibold text-stone-900">
                    {[b.amiCategory ? (lang === "zh" ? CAT_ZH[b.amiCategory] ?? b.amiCategory : b.amiCategory) : null, b.amiPercent != null ? `${b.amiMinPercent != null ? `${b.amiMinPercent}–` : ""}${b.amiPercent}% AMI` : null].filter(Boolean).join(" · ") || t.group}
                  </p>
                  <dl className="mt-1 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-stone-700">
                    <dt className="text-stone-500">{b.unitTypes.length ? t.sizes : t.sizesAll}</dt>
                    <dd>{(b.unitTypes.length ? b.unitTypes : l.unitTypes).map((u) => unitLabel[lang][u]).join(", ") || d.notListed}</dd>
                    <dt className="text-stone-500">{t.household}</dt>
                    <dd>{b.householdSizeMin != null && b.householdSizeMax != null ? fill(t.householdRange, { min: b.householdSizeMin, max: b.householdSizeMax }) : d.notListed}</dd>
                    <dt className="text-stone-500">{t.minIncome}</dt>
                    <dd>{b.minIncome != null ? `$${money(b.minIncome)}` : d.notListed}</dd>
                    <dt className="text-stone-500">{b.maxIncomeByHouseholdSize && Object.keys(b.maxIncomeByHouseholdSize).length ? t.maxIncome : b.amiPercent != null ? t.maxIncomeEstimate : t.maxIncome}</dt>
                    <dd>{incomeCell(b, t)}</dd>
                    <dt className="text-stone-500">{t.rent}</dt>
                    <dd>{b.monthlyRent != null ? `$${money(b.monthlyRent)}${b.monthlyRentMax ? `–$${money(b.monthlyRentMax)}` : ""}` : d.notListed}</dd>
                    {b.unitCount != null && (<><dt className="text-stone-500">{t.count}</dt><dd>{b.unitCount}</dd></>)}
                  </dl>
                  {incompleteRequirements(b, l) && (
                    <p data-testid="income-incomplete" className="mt-2 rounded-lg bg-amber-50 p-2 text-sm text-amber-950">{t.incomplete}</p>
                  )}
                  {b.amiMinPercent != null && b.amiPercent != null && !(b.maxIncomeByHouseholdSize && Object.keys(b.maxIncomeByHouseholdSize).length) && (
                    <p data-testid="range-note" className="mt-2 text-xs text-amber-900">{fill(t.rangeNote, { min: b.amiMinPercent, max: b.amiPercent })}</p>
                  )}
                </li>
              ))}
            </ul>
            {anyEstimate && <p className="mt-2 text-xs text-stone-500">{fill(t.estNote, { y: AMI_TABLE_YEAR })}</p>}
          </>
        )}
      </section>

      {p && (p.mobilityPct || p.visionHearingPct) ? (
        <p data-testid="detail-setaside" className="mt-6 text-sm text-stone-700">
          {fill(t.setAside, { list: [p.mobilityPct ? fill(t.mob, { pct: p.mobilityPct }) : null, p.visionHearingPct ? fill(t.vis, { pct: p.visionHearingPct }) : null].filter(Boolean).join(lang === "zh" ? "、" : ", ") })}
        </p>
      ) : null}

      {p && (p.communityPct > 0 || p.nychaPct > 0 || p.municipalVetPct > 0) && (
        <section data-testid="detail-priority" className="mt-8 rounded-xl bg-sky-50 p-4 text-sm text-sky-950">
          <h2 className="font-semibold">{t.pr}</h2>
          <ul className="mt-1 space-y-1">
            {p.communityPct > 0 && <li>• {districts.length ? fill(t.prCommunity, { pct: p.communityPct, d: districtsLabel(districts, lang)! }) : fill(t.prCommunityAny, { pct: p.communityPct })}</li>}
            {p.nychaPct > 0 && <li>• {fill(t.prNycha, { pct: p.nychaPct })}</li>}
            {p.municipalVetPct > 0 && <li>• {fill(t.prMuni, { pct: p.municipalVetPct })}</li>}
          </ul>
          <p className="mt-1 text-xs text-sky-900/70">{t.prNote}</p>
        </section>
      )}

      {l.eligibilityNotes && (
        <section className="mt-8">
          <h2 className="font-semibold">{t.notes}</h2>
          <p className="mt-1 text-sm text-stone-700">{l.eligibilityNotes}</p>
        </section>
      )}

      <p className="mt-8 text-xs text-stone-500">
        {t.source}: {l.sourceName ?? d.notListed}{checked ? ` · ${t.checked} ${checked}` : ""}{l.dataSource === "muse" ? ` · ${t.notVerified}` : ""}
      </p>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        {safeProviderURL(l.applicationUrl ?? l.sourceUrl) && (
          <a href={safeProviderURL(l.applicationUrl ?? l.sourceUrl) ?? undefined} target="_blank" rel="noopener noreferrer" data-testid="detail-official" className="flex min-h-12 flex-1 items-center justify-center rounded-xl bg-teal-800 px-4 text-center font-semibold text-white hover:bg-teal-900">
            {isHc ? t.officialHc : t.official} ↗<span className="sr-only"> {d.opensNewTab}</span>
          </a>
        )}
        <Link href="/quiz" className="flex min-h-12 flex-1 items-center justify-center rounded-xl border-2 border-teal-800 px-4 font-semibold text-teal-900">{t.check}</Link>
      </div>
      <p className="mt-4 text-xs text-stone-500">{t.disclaimer}</p>
    </article>
  );
}
