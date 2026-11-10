import type { Metadata } from "next";
import Link from "next/link";
import { getLang } from "@/lib/lang";
import { DocChecklist, type DocGroup } from "@/components/DocChecklist";

export const metadata: Metadata = { title: "Prepare your documents · HousingMatch NYC" };

const OFFICIAL = "https://housingconnect.nyc.gov/PublicWeb/assets/ATTACHMENT%20H-1C%20(DOCUMENT%20LIST)%20_ENGLISH.pdf";

// Paraphrased from HPD/HDC "Attachment H-1C: Required Documents" (English list dated 4-1-2025).
// Not legal advice; the building's marketing agent decides what it needs from each household.
const G: Record<"en" | "zh", { title: string; intro: string[]; groups: DocGroup[]; source: string; tipsTitle: string; tips: string[]; back: string }> = {
  en: {
    title: "Get your documents ready",
    intro: [
      "If your application is picked, the building asks you to prove your household and income. You usually get only a short time to send everything, so it helps to gather it early.",
      "Tick what you have. Your ticks stay on this device only; we don't see or store them.",
    ],
    groups: [
      { id: "people", title: "Everyone in the household", items: [
        { id: "id", text: "Photo ID for every adult (18+): driver's license, passport, IDNYC, non-driver ID, or military ID" },
        { id: "birth", text: "Birth certificate for every child under 18" },
        { id: "custody", text: "Proof of custody or guardianship for any child not on the birth certificate" },
        { id: "school", text: "School enrollment letter for any adult who is a college or training-program student" },
        { id: "lastjob", text: "A short signed note with the last day of work for each past job you listed on the application" },
      ] },
      { id: "work", title: "Income from a job", when: "For every adult with a job.", items: [
        { id: "stubs", text: "Recent pay stubs in a row covering one month: 2 stubs if paid monthly, twice a month or every two weeks; 4 if paid weekly" },
        { id: "cash", text: "Paid in cash? A letter from your employer plus bank statements showing the deposits" },
      ] },
      { id: "self", title: "Self-employed or gig work", when: "Only if someone is self-employed.", items: [
        { id: "1040", text: "Last year's signed tax return (Form 1040) with Schedule C, E or F, and all 1099s" },
        { id: "proj", text: "Estimate of net self-employment income for the next 12 months (from an accountant or tax preparer, or your own signed statement)" },
        { id: "backup", text: "Backup such as receipts, invoices, deposits or cancelled checks — required if you haven't filed taxes for this work" },
      ] },
      { id: "benefits", title: "Benefits and other income", when: "Only what applies to you.", items: [
        { id: "award", text: "Benefit award letter from the last 12 months (e.g. SNAP, TANF, Medicaid, WIC) showing who is covered and the household's gross income. If it lists everyone on your application, you may not need other income papers." },
        { id: "voucher", text: "Current Section 8 voucher or proof of another rental subsidy" },
        { id: "unemp", text: "Unemployment payment history from the NYS Department of Labor website" },
        { id: "pa", text: "Public assistance budget letter dated within the last 120 days" },
        { id: "va", text: "Veterans' benefits award letter for this or last year" },
        { id: "child", text: "Child support or alimony: the court order or agreement, or a statement dated within 120 days" },
        { id: "gift", text: "Regular help from family or friends: a signed letter from the giver saying how much, how often, and what for" },
        { id: "other", text: "Any other regular income (rental income, foster care payments, adoption assistance): papers that show it" },
      ] },
      { id: "assets", title: "Savings and assets", when: "Needed if your household's assets are over $51,600.", items: [
        { id: "bank", text: "Latest statements for every bank account — checking, savings, money market, and apps like Venmo, Cash App or PayPal" },
        { id: "invest", text: "Latest statements for stocks, bonds and life insurance" },
        { id: "property", text: "Any real estate: estimated value and latest mortgage bill" },
      ] },
      { id: "rent", title: "Rent history or credit check (pick one)", items: [
        { id: "rent12", text: "Option 1: your lease (or landlord letter) plus proof you paid full rent for the last 12 months — receipts, bank transfers, money order copies or a landlord ledger" },
        { id: "credit", text: "Option 2: a credit check — bring a copy if a building ran one in the last 30 days; otherwise there may be a fee of up to $20" },
      ] },
    ],
    source: "Based on HPD/HDC's official document list (Attachment H-1C, dated April 1, 2025). The building may ask for other papers. Always follow the request you receive.",
    tipsTitle: "Tips",
    tips: [
      "Make copies or clear phone photos. If you applied online, you can upload documents to your Housing Connect account.",
      "Answer document requests quickly. Missing the deadline can cost you your place.",
      "Never pay anyone to “guarantee” an apartment. Applying through Housing Connect is free.",
    ],
    back: "← Back to my matches",
  },
  zh: {
    title: "提前准备申请材料",
    intro: [
      "如果你的申请被抽中，楼盘会要求你证明家庭成员和收入。通常给的时间不长，所以最好提前把材料准备好。",
      "准备好一项就打个勾。打勾记录只保存在这台设备上，我们看不到，也不会保存。",
    ],
    groups: [
      { id: "people", title: "家里每个人", items: [
        { id: "id", text: "每位成年人（18 岁以上）的带照片证件：驾照、护照、IDNYC 市民卡、非驾驶身份证或军人证" },
        { id: "birth", text: "每个 18 岁以下孩子的出生证明" },
        { id: "custody", text: "如果孩子不在出生证明上，需要监护权或抚养权证明" },
        { id: "school", text: "成年家庭成员如果在读大学或培训课程，需要在读证明信" },
        { id: "lastjob", text: "申请表上写过的以前的工作，每份写一张签名说明，注明最后工作日" },
      ] },
      { id: "work", title: "工作收入", when: "每位有工作的成年人都需要。", items: [
        { id: "stubs", text: "最近连续一个月的工资单：月薪、半月薪或两周发一次的要 2 张；每周发的要 4 张" },
        { id: "cash", text: "拿现金工资？需要雇主证明信，加上能看到存款的银行对账单" },
      ] },
      { id: "self", title: "自雇或零工收入", when: "只有家里有人自雇时需要。", items: [
        { id: "1040", text: "去年签好字的报税表（1040）及附表 C、E 或 F，还有所有 1099" },
        { id: "proj", text: "未来 12 个月自雇净收入的估算（会计师或报税员出具，或自己签名的说明）" },
        { id: "backup", text: "收据、发票、入账记录或已兑现支票等证明；这份收入没有报过税的话必须提供" },
      ] },
      { id: "benefits", title: "补助和其他收入", when: "有哪项准备哪项。", items: [
        { id: "award", text: "最近 12 个月内的福利批准信（如 SNAP 粮食券、TANF、Medicaid、WIC），上面要有受益人和家庭税前收入。如果上面列出了申请表上的所有人，可能就不用再交其他收入证明" },
        { id: "voucher", text: "有效的 Section 8 住房券，或其他租房补贴证明" },
        { id: "unemp", text: "纽约州劳工局网站上的失业金领取记录" },
        { id: "pa", text: "最近 120 天内的公共援助（现金补助）预算信" },
        { id: "va", text: "今年或去年的退伍军人福利批准信" },
        { id: "child", text: "子女抚养费或赡养费：法院判决或协议，或最近 120 天内的付款记录" },
        { id: "gift", text: "亲友定期给钱：给钱的人签名的说明，写明金额、频率和用途" },
        { id: "other", text: "其他固定收入（房租收入、寄养费、领养补助等）的证明" },
      ] },
      { id: "assets", title: "存款和资产", when: "家庭资产超过 $51,600 时需要。", items: [
        { id: "bank", text: "所有银行账户的最新对账单：支票、储蓄、货币市场账户，还有 Venmo、Cash App、PayPal 等" },
        { id: "invest", text: "股票、债券和人寿保险的最新对账单" },
        { id: "property", text: "如有房产：估价和最近一期房贷账单" },
      ] },
      { id: "rent", title: "租房记录或信用审查（二选一）", items: [
        { id: "rent12", text: "选项一：租约（或房东证明信），加上最近 12 个月按时交足房租的证明：收据、银行转账、汇票复印件或房东账本" },
        { id: "credit", text: "选项二：信用审查。如果 30 天内有楼盘查过，带上复印件；否则可能要交最多 $20 的费用" },
      ] },
    ],
    source: "根据 HPD/HDC 官方材料清单（Attachment H-1C，2025 年 4 月 1 日版）整理。楼盘可能还会要求其他材料，请以你收到的通知为准。",
    tipsTitle: "小提示",
    tips: [
      "复印或用手机拍清楚。网上申请的话，可以把材料上传到你的 Housing Connect 账号。",
      "收到材料通知后要尽快回复，错过期限可能失去机会。",
      "不要付钱给任何声称能“保证”拿到房子的人。通过 Housing Connect 申请是免费的。",
    ],
    back: "← 回到我的匹配结果",
  },
};

export default async function Prepare() {
  const lang = await getLang();
  const t = G[lang];
  return (
    <article data-testid="prepare" className="mx-auto max-w-2xl">
      <Link href="/quiz" className="inline-flex min-h-11 items-center text-sm font-medium text-teal-800 print:hidden">{t.back}</Link>
      <h1 className="mt-2 text-2xl font-bold tracking-tight text-stone-900 sm:text-3xl">{t.title}</h1>
      {t.intro.map((p) => (
        <p key={p} className="mt-2 text-stone-700">{p}</p>
      ))}
      <DocChecklist groups={t.groups} lang={lang} />
      <section className="mt-8 rounded-2xl bg-teal-50 p-4 text-sm text-teal-950">
        <h2 className="font-semibold">{t.tipsTitle}</h2>
        <ul className="mt-2 space-y-1">
          {t.tips.map((x) => (
            <li key={x} className="flex gap-2"><span aria-hidden>•</span>{x}</li>
          ))}
        </ul>
      </section>
      <p className="mt-6 text-xs text-stone-500">
        {t.source}{" "}
        <a href={OFFICIAL} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">Attachment H-1C ↗</a>
      </p>
    </article>
  );
}
