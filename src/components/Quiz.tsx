"use client";
import { useEffect, useMemo, useState } from "react";
import { BOROUGHS, UNIT_TYPES, type Borough, type UnitType } from "@/lib/types";
import { boroughLabel, unitLabel, type Lang } from "@/lib/i18n";
import { MatchResults, type Row } from "./MatchResults";
import { RerentalSection } from "./RerentalSection";

type Voucher = "yes" | "no" | "unsure";
interface Answers {
  boroughs: Borough[];
  bedrooms: UnitType[];
  rentMax: number | null;
  size: number;
  income: string;
  voucher: Voucher | null;
  senior: boolean;
  disability: boolean;
}
const EMPTY: Answers = { boroughs: [], bedrooms: [], rentMax: null, size: 1, income: "", voucher: null, senior: false, disability: false };
const STORE = "hm-quiz-v1"; // sessionStorage only: answers never leave this browser tab except for the one match request

const BUDGETS = [1000, 1500, 2000, 2500, 3000, 3500, 4500];

const C = {
  en: {
    step: "Question {n} of {total}",
    back: "Back",
    next: "Next",
    skip: "Skip",
    any: "Anywhere is fine",
    anySize: "Any size",
    noBudget: "No limit / not sure",
    q1: "Where would you like to live?",
    h1: "Pick as many boroughs as you like.",
    q2: "What apartment size do you need?",
    h2: "Pick all that would work for you.",
    q3: "What's the most you can pay in rent each month?",
    h3: "Many listings don't publish rent here yet — those still show, marked \"rent not listed\".",
    q4: "How many people will live with you, including you?",
    h4: "Count everyone who will live in the apartment, including children.",
    q5: "What's your household's total yearly income before taxes?",
    h5: "Add up everyone's income in the household: wages, benefits, child support, etc. An estimate is fine.",
    q6: "Do you have a housing voucher or rental subsidy?",
    h6: "For example Section 8 or CityFHEPS.",
    yes: "Yes",
    no: "No",
    unsure: "Not sure",
    q7: "Anything else that applies? (optional)",
    h7: "Some buildings set aside apartments for these households.",
    senior: "Someone is 62 or older",
    disability: "Someone has a disability",
    none: "None of these",
    seeMatches: "See my matches",
    loading: "Finding your matches…",
    error: "Something went wrong. Please try again.",
    previewTitle: "Here's what we found for you",
    pLikely: "Preliminary matches",
    pLikelyD: "Your household appears to fit the published income limits.",
    pReview: "Possible — need checking",
    pReviewD: "We don't have the full income chart yet; you'd need to confirm.",
    pOpen: "Open lotteries in your areas",
    pOpenD: "Currently accepting applications on Housing Connect.",
    plusRr: "Plus {n} re-rentals and waiting lists to explore.",
    disclaimer: "These are estimates, not an official decision. HousingMatch doesn't affect lottery selection.",
    unlock: "Create your free account to see all your matches",
    unlockD: "Free. No credit card. Save homes and get deadline reminders.",
    authSoon: "Account sign-up is being set up. For now you can view your full results here.",
    viewNow: "View my full results",
    edit: "Change my answers",
  },
  zh: {
    step: "第 {n} 题，共 {total} 题",
    back: "上一步",
    next: "下一步",
    skip: "跳过",
    any: "哪里都可以",
    anySize: "户型不限",
    noBudget: "不限 / 不确定",
    q1: "你想住在哪里？",
    h1: "可以选多个区。",
    q2: "你需要多大的公寓？",
    h2: "可以的户型都选上。",
    q3: "每个月房租最多能付多少？",
    h3: "很多房源暂时没有公布租金，这些房源仍会显示，并标明「未公布租金」。",
    q4: "包括你自己，一共几个人住？",
    h4: "所有会住在这套公寓里的人都要算上，包括孩子。",
    q5: "全家一年的税前总收入是多少？",
    h5: "把家里每个人的收入加起来：工资、补助、子女抚养费等。大概的数字就可以。",
    q6: "你有住房补助券或租金补贴吗？",
    h6: "例如 Section 8 或 CityFHEPS。",
    yes: "有",
    no: "没有",
    unsure: "不确定",
    q7: "还有以下情况吗？（选填）",
    h7: "有些楼盘会为这些家庭保留部分单位。",
    senior: "家里有人 62 岁或以上",
    disability: "家里有人有残障",
    none: "都没有",
    seeMatches: "查看我的匹配",
    loading: "正在为你匹配…",
    error: "出错了，请再试一次。",
    previewTitle: "为你找到的结果",
    pLikely: "初步符合",
    pLikelyD: "按公布的收入限额，你的家庭看起来符合。",
    pReview: "可能符合，需要核实",
    pReviewD: "我们还没有完整的收入表，需要你去确认。",
    pOpen: "你选的区域里正在开放的抽签",
    pOpenD: "目前正在 Housing Connect 上接受申请。",
    plusRr: "另外还有 {n} 个空出房源（Re-rental）和等候名单可以看看。",
    disclaimer: "以上只是估算，不是官方审核结果。HousingMatch 不会影响抽签结果。",
    unlock: "免费注册，查看全部匹配结果",
    unlockD: "免费，不需要信用卡。可以收藏房源、接收截止提醒。",
    authSoon: "注册功能正在搭建中。现在可以先在这里查看完整结果。",
    viewNow: "查看完整结果",
    edit: "修改我的回答",
  },
} as const;

const fill = (s: string, v: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (_, k) => String(v[k] ?? ""));
type R = Row;

function Choice({ on, onClick, children, testid }: { on: boolean; onClick: () => void; children: React.ReactNode; testid?: string }) {
  return (
    <button
      type="button"
      data-testid={testid}
      aria-pressed={on}
      onClick={onClick}
      className={`min-h-14 w-full rounded-2xl border-2 px-4 text-left text-base font-medium transition ${
        on ? "border-teal-800 bg-teal-50 text-teal-950" : "border-stone-200 bg-white text-stone-800 hover:border-stone-400"
      }`}
    >
      <span className="flex items-center justify-between gap-3">
        {children}
        <span aria-hidden className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 ${on ? "border-teal-800 bg-teal-800 text-white" : "border-stone-300"}`}>
          {on ? "✓" : ""}
        </span>
      </span>
    </button>
  );
}

export function Quiz({ lang, authEnabled }: { lang: Lang; authEnabled: boolean }) {
  const t = C[lang];
  const [a, setA] = useState<Answers>(EMPTY);
  const [step, setStep] = useState(0);
  const [rows, setRows] = useState<R[] | null>(null);
  const [rerentals, setRerentals] = useState<R[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [full, setFull] = useState(false);

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(STORE);
      if (saved) setA({ ...EMPTY, ...JSON.parse(saved) });
    } catch {}
  }, []);
  useEffect(() => {
    try {
      sessionStorage.setItem(STORE, JSON.stringify(a));
    } catch {}
  }, [a]);

  const up = <K extends keyof Answers>(k: K, v: Answers[K]) => setA((x) => ({ ...x, [k]: v }));
  const toggle = <T,>(arr: T[], v: T) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
  const incomeNum = Math.round(Number(a.income.replace(/[^\d.]/g, "")) || 0);

  const TOTAL = 7;
  const canNext = step === 4 ? a.income.trim() !== "" : step === 5 ? a.voucher != null : true;

  async function run() {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch("/api/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          size: a.size,
          annualIncome: incomeNum,
          boroughs: a.boroughs,
          bedrooms: a.bedrooms,
          rentMax: a.rentMax,
          hasVoucher: a.voucher === "yes",
          hasMember62Plus: a.senior,
          hasMember55Plus: a.senior,
          hasDisability: a.disability,
        }),
      });
      if (!res.ok) throw new Error();
      const d = await res.json();
      setRows(d.results);
      setRerentals(d.rerentals ?? []);
      setStep(TOTAL);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  const counts = useMemo(() => {
    const inPrefs = (rows ?? []).filter((r) => r.result.matchesPreferences);
    return {
      likely: inPrefs.filter((r) => r.result.status === "LIKELY_MATCH").length,
      review: inPrefs.filter((r) => r.result.status === "NEEDS_REVIEW").length,
      open: inPrefs.filter((r) => r.availability === "verified_open").length,
      rr: rerentals.filter((r) => r.result.matchesPreferences && r.result.status !== "UNLIKELY_MATCH").length,
    };
  }, [rows, rerentals]);

  const next = () => (step === TOTAL - 1 ? run() : setStep(step + 1));

  // ---------- results ----------
  if (step === TOTAL && rows) {
    return (
      <div data-testid="quiz-results" className="mx-auto max-w-3xl">
        {!full ? (
          <section className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
            <h1 className="text-2xl font-bold tracking-tight text-stone-900 sm:text-3xl">{t.previewTitle}</h1>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {[
                ["likely", counts.likely, t.pLikely, t.pLikelyD, "bg-teal-50 text-teal-950"],
                ["review", counts.review, t.pReview, t.pReviewD, "bg-amber-50 text-amber-950"],
                ["open", counts.open, t.pOpen, t.pOpenD, "bg-stone-50 text-stone-900"],
              ].map(([k, n, label, desc, cls]) => (
                <div key={k as string} data-testid={`count-${k}`} className={`rounded-2xl p-4 ${cls}`}>
                  <p className="text-4xl font-bold tabular-nums">{n as number}</p>
                  <p className="mt-1 font-semibold">{label as string}</p>
                  <p className="mt-1 text-sm opacity-80">{desc as string}</p>
                </div>
              ))}
            </div>
            {counts.rr > 0 && <p className="mt-4 text-sm text-indigo-900">{fill(t.plusRr, { n: counts.rr })}</p>}
            <p className="mt-4 rounded-xl bg-stone-100 px-4 py-3 text-sm text-stone-700">{t.disclaimer}</p>
            <div className="mt-6 rounded-2xl border-2 border-teal-800 p-5">
              <p className="text-lg font-semibold text-stone-900">{t.unlock}</p>
              <p className="mt-1 text-sm text-stone-600">{t.unlockD}</p>
              {authEnabled ? (
                <a href="/signup" className="mt-4 flex min-h-12 items-center justify-center rounded-xl bg-teal-800 px-5 font-semibold text-white hover:bg-teal-900">
                  {t.unlock}
                </a>
              ) : (
                <>
                  <p data-testid="auth-soon" className="mt-3 text-sm text-stone-600">{t.authSoon}</p>
                  <button type="button" onClick={() => setFull(true)} className="mt-3 flex min-h-12 w-full items-center justify-center rounded-xl bg-teal-800 px-5 font-semibold text-white hover:bg-teal-900">
                    {t.viewNow}
                  </button>
                </>
              )}
            </div>
            <button type="button" onClick={() => setStep(0)} className="mt-4 min-h-11 text-sm font-medium text-teal-800 underline underline-offset-4">
              {t.edit}
            </button>
          </section>
        ) : (
          <>
            <MatchResults rows={rows} lang={lang} />
            <RerentalSection rows={rerentals} lang={lang} />
            <button type="button" onClick={() => { setFull(false); setStep(0); }} className="mt-6 min-h-11 text-sm font-medium text-teal-800 underline underline-offset-4">
              {t.edit}
            </button>
          </>
        )}
      </div>
    );
  }

  // ---------- questions ----------
  const q = [
    { title: t.q1, help: t.h1 },
    { title: t.q2, help: t.h2 },
    { title: t.q3, help: t.h3 },
    { title: t.q4, help: t.h4 },
    { title: t.q5, help: t.h5 },
    { title: t.q6, help: t.h6 },
    { title: t.q7, help: t.h7 },
  ][step];
  const optional = step <= 2 || step === 6;

  return (
    <div data-testid="quiz" className="mx-auto max-w-xl">
      <div className="mb-6">
        <div className="flex items-center justify-between text-sm text-stone-600">
          <span data-testid="quiz-step">{fill(t.step, { n: step + 1, total: TOTAL })}</span>
          {step > 0 && (
            <button type="button" onClick={() => setStep(step - 1)} className="min-h-11 px-2 font-medium text-teal-800">
              ← {t.back}
            </button>
          )}
        </div>
        <div className="mt-2 h-2 rounded-full bg-stone-200" role="progressbar" aria-valuemin={1} aria-valuemax={TOTAL} aria-valuenow={step + 1}>
          <div className="h-2 rounded-full bg-teal-700 transition-all" style={{ width: `${((step + 1) / TOTAL) * 100}%` }} />
        </div>
      </div>

      <h1 className="text-2xl font-bold tracking-tight text-stone-900 sm:text-3xl">{q.title}</h1>
      <p className="mt-2 text-stone-600">{q.help}</p>

      <div className="mt-6 space-y-3">
        {step === 0 && (
          <>
            <Choice on={a.boroughs.length === 0} onClick={() => up("boroughs", [])}>{t.any}</Choice>
            {BOROUGHS.map((b) => (
              <Choice key={b} on={a.boroughs.includes(b)} onClick={() => up("boroughs", toggle(a.boroughs, b))}>{boroughLabel[lang][b]}</Choice>
            ))}
          </>
        )}
        {step === 1 && (
          <>
            <Choice on={a.bedrooms.length === 0} onClick={() => up("bedrooms", [])}>{t.anySize}</Choice>
            {UNIT_TYPES.map((u) => (
              <Choice key={u} on={a.bedrooms.includes(u)} onClick={() => up("bedrooms", toggle(a.bedrooms, u))}>{unitLabel[lang][u]}</Choice>
            ))}
          </>
        )}
        {step === 2 && (
          <>
            <Choice on={a.rentMax == null} onClick={() => up("rentMax", null)}>{t.noBudget}</Choice>
            {BUDGETS.map((b) => (
              <Choice key={b} on={a.rentMax === b} onClick={() => up("rentMax", b)}>{`$${b.toLocaleString("en-US")}`}</Choice>
            ))}
          </>
        )}
        {step === 3 && (
          <div className="flex items-center justify-center gap-6 py-4">
            <button type="button" aria-label="−" onClick={() => up("size", Math.max(1, a.size - 1))} className="h-16 w-16 rounded-2xl border-2 border-stone-300 text-3xl hover:bg-stone-50">−</button>
            <span data-testid="quiz-size" className="w-16 text-center text-5xl font-bold tabular-nums" aria-live="polite">{a.size}</span>
            <button type="button" aria-label="+" onClick={() => up("size", Math.min(12, a.size + 1))} className="h-16 w-16 rounded-2xl border-2 border-stone-300 text-3xl hover:bg-stone-50">+</button>
          </div>
        )}
        {step === 4 && (
          <label className="block">
            <span className="sr-only">{t.q5}</span>
            <div className="relative">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-xl text-stone-500">$</span>
              <input
                autoFocus
                inputMode="numeric"
                value={a.income}
                onChange={(e) => up("income", e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && canNext && next()}
                placeholder="65,000"
                className="min-h-16 w-full rounded-2xl border-2 border-stone-300 pl-9 pr-4 text-2xl tabular-nums outline-none focus:border-teal-700"
              />
            </div>
          </label>
        )}
        {step === 5 &&
          (["yes", "no", "unsure"] as const).map((v) => (
            <Choice key={v} on={a.voucher === v} onClick={() => up("voucher", v)}>{t[v]}</Choice>
          ))}
        {step === 6 && (
          <>
            <Choice on={a.senior} onClick={() => up("senior", !a.senior)}>{t.senior}</Choice>
            <Choice on={a.disability} onClick={() => up("disability", !a.disability)}>{t.disability}</Choice>
            <Choice on={!a.senior && !a.disability} onClick={() => setA((x) => ({ ...x, senior: false, disability: false }))}>{t.none}</Choice>
          </>
        )}
      </div>

      {error && <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">{t.error}</p>}

      <div className="sticky bottom-0 mt-8 flex gap-3 bg-stone-50/95 py-4 backdrop-blur">
        {optional && step !== 6 && (
          <button type="button" onClick={() => setStep(step + 1)} className="min-h-14 flex-1 rounded-2xl border-2 border-stone-300 font-semibold text-stone-700">
            {t.skip}
          </button>
        )}
        <button
          type="button"
          data-testid="quiz-next"
          disabled={!canNext || loading}
          onClick={next}
          className="min-h-14 flex-[2] rounded-2xl bg-teal-800 font-semibold text-white transition hover:bg-teal-900 disabled:opacity-50"
        >
          {loading ? t.loading : step === TOTAL - 1 ? t.seeMatches : t.next}
        </button>
      </div>
    </div>
  );
}
