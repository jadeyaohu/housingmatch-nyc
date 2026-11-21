import type { Metadata } from "next";
import Link from "next/link";
import { getLang } from "@/lib/lang";

export const metadata: Metadata = { title: "After you apply · HousingMatch NYC" };

const SOURCE = "https://www.nyc.gov/assets/hpd/downloads/pdfs/services/applying-to-affordable-housing-english-text.pdf";

// Paraphrased from HPD's official guide "Applying to Affordable Housing" (steps 4–6). No odds claims.
const C = {
  en: {
    title: "What happens after you apply",
    intro: "Here's how a Housing Connect lottery works after the deadline, based on HPD's official guide.",
    steps: [
      { t: "Your application gets a random log number", d: "After the deadline, all applications are put in random order. When you applied, and whether online or on paper, doesn't change your place." },
      { t: "Buildings review in log-number order", d: "Applicants in priority groups (for example local residents or city employees) are reviewed first, then others in log-number order." },
      { t: "Waiting: often 2 to 12 months", d: "You may hear back 2–12 months after the deadline — or not at all, even if you could qualify. A low log number or a priority group makes contact more likely. Keep your Housing Connect profile up to date while you wait." },
      { t: "If you're contacted: send documents fast", d: "The building lists the documents it needs. You may have only a few business days, so answer right away. Being asked for documents doesn't guarantee an apartment." },
      { t: "City review", d: "After the building checks your eligibility, HPD or HDC reviews your file. The building contacts you if there are questions." },
      { t: "Offer — or a rejection you can appeal", d: "If you qualify, you may be offered a lease. If you're rejected, the notice explains how to appeal: write why you think the decision is wrong and include proof. If you still disagree, you can complain to HPD or HDC." },
    ],
    keepTitle: "While you wait",
    keep: [
      "Keep applying — you can apply to as many lotteries as you like.",
      "Answer every question truthfully. False or missing information can disqualify you.",
      "Never pay anyone for an application. Applying is free.",
    ],
    prepare: "Get your documents ready now →",
    source: "Source: HPD, \"Applying to Affordable Housing\". HousingMatch doesn't run lotteries and can't change your log number.",
    back: "← Back to my matches",
  },
  zh: {
    title: "申请之后会发生什么",
    intro: "根据 HPD 官方指南，介绍 Housing Connect 抽签在截止之后的流程。",
    steps: [
      { t: "你的申请会拿到一个随机的 Log Number（排位号）", d: "截止后，所有申请随机排序。什么时候交、网上交还是纸质交，都不影响你的排位。" },
      { t: "楼盘按排位号顺序审核", d: "属于优先组的申请人（例如本社区居民、市政府雇员）先审核，其他人按排位号顺序审核。" },
      { t: "等待：通常 2 到 12 个月", d: "你可能在截止后 2–12 个月收到通知，也可能一直没有消息，即使你符合条件。排位号靠前或属于优先组，更有可能被联系。等待期间请保持 Housing Connect 资料是最新的。" },
      { t: "如果被联系：尽快交材料", d: "楼盘会列出需要的材料，可能只给几个工作日，所以要马上回复。被要求交材料不代表一定能拿到房子。" },
      { t: "政府审核", d: "楼盘核实资格之后，HPD 或 HDC 会再审核你的档案。如果有问题，楼盘会联系你。" },
      { t: "得到租约，或收到可以申诉的拒信", d: "如果符合条件，可能会得到租约。如果被拒，拒信会说明怎么申诉：写清楚你认为哪里判断错了，并附上证明。仍不同意的话，可以向 HPD 或 HDC 投诉。" },
    ],
    keepTitle: "等待期间",
    keep: [
      "继续申请：抽签数量没有限制，想申请多少都可以。",
      "所有问题都要如实回答。虚假或遗漏的信息可能导致你失去资格。",
      "不要付钱给任何人办申请。申请是免费的。",
    ],
    prepare: "现在就准备申请材料 →",
    source: "来源：HPD《Applying to Affordable Housing》。HousingMatch 不举办抽签，也无法改变你的排位号。",
    back: "← 回到我的匹配结果",
  },
} as const;

export default async function AfterYouApply() {
  const lang = await getLang();
  const t = C[lang];
  return (
    <article data-testid="after-you-apply" className="mx-auto max-w-2xl">
      <Link href="/quiz" className="inline-flex min-h-11 items-center text-sm font-medium text-teal-800">{t.back}</Link>
      <h1 className="mt-2 text-2xl font-bold tracking-tight text-stone-900 sm:text-3xl">{t.title}</h1>
      <p className="mt-2 text-stone-700">{t.intro}</p>
      <ol className="mt-6 space-y-4">
        {t.steps.map((s, i) => (
          <li key={s.t} className="flex gap-4">
            <span aria-hidden className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-teal-800 text-sm font-bold text-white">{i + 1}</span>
            <div>
              <h2 className="font-semibold text-stone-900">{s.t}</h2>
              <p className="mt-1 text-sm text-stone-700">{s.d}</p>
            </div>
          </li>
        ))}
      </ol>
      <section className="mt-8 rounded-2xl bg-teal-50 p-4 text-sm text-teal-950">
        <h2 className="font-semibold">{t.keepTitle}</h2>
        <ul className="mt-2 space-y-1">
          {t.keep.map((x) => <li key={x} className="flex gap-2"><span aria-hidden>•</span>{x}</li>)}
        </ul>
      </section>
      <Link href="/prepare" data-testid="to-prepare" className="mt-6 flex min-h-12 items-center justify-center rounded-xl bg-teal-800 px-4 font-semibold text-white hover:bg-teal-900">{t.prepare}</Link>
      <p className="mt-6 text-xs text-stone-500">
        {t.source} <a href={SOURCE} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">HPD ↗</a>
      </p>
    </article>
  );
}
