"use client";
import { useEffect, useMemo, useState } from "react";
import { BOROUGHS, UNIT_TYPES, type Borough, type UnitType } from "@/lib/types";
import { boroughLabel, unitLabel, type Lang } from "@/lib/i18n";
import { MatchResults, type Row } from "./MatchResults";
import { RerentalSection } from "./RerentalSection";
import { browserClient } from "@/lib/supabase/browser";
import type { AuthConfig } from "@/lib/supabase/config";

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
  zip: string;
  nycha: boolean;
  municipalVet: boolean;
}
const EMPTY: Answers = { boroughs: [], bedrooms: [], rentMax: null, size: 1, income: "", voucher: null, senior: false, disability: false, zip: "", nycha: false, municipalVet: false };
const STORE = "hm-quiz-v1";
// Kept on this device only (24 h) so the answers survive opening the sign-in link in a new tab.
// Sent once to /api/match (not stored there); saved to the account only when the user agrees.
const TTL = 24 * 3600 * 1000;

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
    h5: "Add up everyone's income in the household: wages, benefits, child support, etc. Use the amount before taxes are taken out. An estimate is fine.",
    q6: "Does a program pay part of your rent, like a housing voucher?",
    h6: "For example Section 8 or CityFHEPS — programs that pay part of your rent for you.",
    yes: "Yes",
    no: "No",
    unsure: "Not sure",
    q7: "Anything else that applies? (optional)",
    h7: "Some buildings set aside apartments for these households, or review their applications first.",
    senior: "Someone is 62 or older",
    disability: "Someone has a disability",
    nycha: "We live in NYCHA public housing (run by the NYC Housing Authority)",
    municipalVet: "Someone works for the City of New York, or is a U.S. military veteran",
    zip: "Your home ZIP code (optional)",
    zipHelp: "Many lotteries save some apartments for people who already live nearby. We use your ZIP only to check this and never store it on our servers.",
    none: "None of these",
    seeMatches: "See my matches",
    loading: "Finding your matches…",
    error: "Something went wrong. Please try again.",
    previewTitle: "Here's what we found for you",
    pLikely: "Look like a fit",
    pLikelyD: "Your income and household size fit the income limits these lotteries published.",
    pReview: "Might fit",
    pReviewD: "We're missing part of the income chart. Check it on Housing Connect before applying.",
    pOpen: "Of these, open now",
    pOpenD: "Lotteries above that are accepting applications on Housing Connect today.",
    plusRr: "Plus {n} single apartments that opened up again (re-rentals) and waiting lists to look at.",
    disclaimer: "These are estimates, not an official decision. HousingMatch doesn't affect lottery selection.",
    unlock: "Create your free account to see all your matches",
    unlockD: "Free. No credit card. Save homes and get deadline reminders.",
    authSoon: "Account sign-up is being set up. For now you can view your full results here.",
    signupBtn: "Create my free account",
    saveTitle: "Save your answers to your account?",
    consent: "I agree to HousingMatch storing my household size, income, the answers above (not my ZIP code) and my preferences to show my matches.",
    privacyLink: "Privacy notice",
    saveBtn: "Save my profile",
    savedOk: "Saved.",
    myAccount: "My account",
    viewNow: "View my full results",
    edit: "Change my answers",
    startOver: "Start over",
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
    h5: "把家里每个人的收入加起来：工资、补助、子女抚养费等，按还没扣税的金额算。大概的数字就可以。",
    q6: "有没有政府项目帮你付一部分房租？",
    h6: "例如 Section 8（联邦租房补助券）或 CityFHEPS（纽约市租房补助）。",
    yes: "有",
    no: "没有",
    unsure: "不确定",
    q7: "还有以下情况吗？（选填）",
    h7: "有些楼盘会为这些家庭保留部分单位，或者优先审核他们的申请。",
    senior: "家里有人 62 岁或以上",
    disability: "家里有人有残障",
    nycha: "我们住在 NYCHA 公房（纽约市房屋局管理的公共住房）",
    municipalVet: "家里有人在纽约市政府工作，或是美国退伍军人",
    zip: "你家的邮编（选填）",
    zipHelp: "很多抽签会给附近的居民留一部分单位。邮编只用来判断这一点，不会存到我们的服务器上。",
    none: "都没有",
    seeMatches: "查看我的匹配",
    loading: "正在为你匹配…",
    error: "出错了，请再试一次。",
    previewTitle: "为你找到的结果",
    pLikely: "看起来符合",
    pLikelyD: "按这些抽签公布的收入要求，你家的收入和人数看起来符合。",
    pReview: "可能符合",
    pReviewD: "我们缺少部分收入表，申请前请在 Housing Connect 上核对。",
    pOpen: "其中现在可以申请的",
    pOpenD: "上面这些抽签里，今天在 Housing Connect 上还能申请的。",
    plusRr: "另外还有 {n} 个重新空出来的单套房源和等候名单可以看看。",
    disclaimer: "以上只是估算，不是官方审核结果。HousingMatch 不会影响抽签结果。",
    unlock: "免费注册，查看全部匹配结果",
    unlockD: "免费，不需要信用卡。可以收藏房源、接收截止提醒。",
    authSoon: "注册功能正在搭建中。现在可以先在这里查看完整结果。",
    signupBtn: "免费注册账号",
    saveTitle: "把你的回答保存到账号里？",
    consent: "我同意 HousingMatch 保存我的家庭人数、收入、上面的回答（不包括邮编）和偏好，用来显示我的匹配结果。",
    privacyLink: "隐私说明",
    saveBtn: "保存我的资料",
    savedOk: "已保存。",
    myAccount: "我的账号",
    viewNow: "查看完整结果",
    edit: "修改我的回答",
    startOver: "重新开始",
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

export function Quiz({ lang, auth, signedIn, profile }: { lang: Lang; auth: AuthConfig | null; signedIn: boolean; profile: Partial<Answers> | null }) {
  const t = C[lang];
  const [a, setA] = useState<Answers>(EMPTY);
  const [step, setStep] = useState(0);
  const [rows, setRows] = useState<R[] | null>(null);
  const [rerentals, setRerentals] = useState<R[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [full, setFull] = useState(false);

  const [ready, setReady] = useState(false);
  useEffect(() => {
    let loaded: Answers | null = null;
    try {
      const raw = localStorage.getItem(STORE);
      if (raw) {
        const { at, v, s } = JSON.parse(raw);
        if (Date.now() - at < TTL) {
          loaded = { ...EMPTY, ...v };
          if (typeof s === "number" && s > 0 && s < 7) setStep(s); // pick up where they left off
        }
        else localStorage.removeItem(STORE);
      }
    } catch {}
    if (!loaded && profile) loaded = { ...EMPTY, ...profile };
    if (loaded) setA(loaded);
    setReady(true);
    // Signed in and the questions are answered → go straight to results.
    if (signedIn && loaded && loaded.income.trim() !== "" && loaded.voucher) void run(loaded);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(STORE, JSON.stringify({ at: Date.now(), v: a, s: step < 7 ? step : 0 }));
    } catch {}
  }, [a, step, ready]);
  const startOver = () => {
    setA(EMPTY);
    setStep(0);
    setRows(null);
    try { localStorage.removeItem(STORE); } catch {}
  };

  const up = <K extends keyof Answers>(k: K, v: Answers[K]) => setA((x) => ({ ...x, [k]: v }));
  const toggle = <T,>(arr: T[], v: T) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
  const incomeNum = Math.round(Number(a.income.replace(/[^\d.]/g, "")) || 0);

  const TOTAL = 7;
  const canNext = step === 4 ? a.income.trim() !== "" : step === 5 ? a.voucher != null : true;

  async function run(ans: Answers = a) {
    const a2 = ans;
    const incomeN = Math.round(Number(a2.income.replace(/[^\d.]/g, "")) || 0);
    setLoading(true);
    setError(false);
    try {
      const res = await fetch("/api/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          size: a2.size,
          annualIncome: incomeN,
          boroughs: a2.boroughs,
          bedrooms: a2.bedrooms,
          rentMax: a2.rentMax,
          hasVoucher: a2.voucher === "yes",
          hasMember62Plus: a2.senior,
          hasMember55Plus: a2.senior,
          hasDisability: a2.disability,
          zip: /^\d{5}$/.test(a2.zip.trim()) ? a2.zip.trim() : null,
          nycha: a2.nycha ? true : null,
          municipalVet: a2.municipalVet ? true : null,
        }),
      });
      if (!res.ok) throw new Error();
      const d = await res.json();
      setRows(d.results);
      setRerentals(d.rerentals ?? []);
      setStep(TOTAL);
      if (signedIn) setFull(true);
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
      // Same households as the two numbers before it: open lotteries you may qualify for.
      open: inPrefs.filter((r) => r.result.status !== "UNLIKELY_MATCH" && r.availability === "verified_open").length,
      rr: rerentals.filter((r) => r.result.matchesPreferences && r.result.status !== "UNLIKELY_MATCH").length,
    };
  }, [rows, rerentals]);

  const next = () => (step === TOTAL - 1 ? run() : setStep(step + 1));
  const [consent, setConsent] = useState(false);
  const [saved, setSaved] = useState<"idle" | "saving" | "saved" | "error">("idle");
  async function saveProfile() {
    if (!auth) return;
    setSaved("saving");
    const sb = browserClient(auth);
    const { data: u } = await sb.auth.getUser();
    if (!u.user) return setSaved("error");
    const { error } = await sb.from("household_profiles").upsert({
      user_id: u.user.id, household_size: a.size, annual_income: incomeNum, voucher: a.voucher ?? "no",
      has_member_62_plus: a.senior, has_disability: a.disability, boroughs: a.boroughs, bedrooms: a.bedrooms,
      rent_max: a.rentMax, language: lang, consented_at: new Date().toISOString(),
      nycha_resident: a.nycha, municipal_or_veteran: a.municipalVet, // ZIP is never saved
    });
    if (error) return setSaved("error");
    setSaved("saved");
    try { localStorage.removeItem(STORE); } catch {}
  }

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
              {auth ? (
                <a href={`/signup?next=${encodeURIComponent("/quiz")}`} data-testid="signup-cta" className="mt-4 flex min-h-12 items-center justify-center rounded-xl bg-teal-800 px-5 font-semibold text-white hover:bg-teal-900">
                  {t.signupBtn}
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
            {signedIn && (
              <div data-testid="save-profile" className="mb-6 rounded-2xl border border-teal-200 bg-teal-50/60 p-4 text-sm">
                {saved === "saved" ? (
                  <p className="font-medium text-teal-900">{t.savedOk} <a href="/account" className="underline underline-offset-4">{t.myAccount}</a></p>
                ) : (
                  <>
                    <p className="font-semibold text-stone-900">{t.saveTitle}</p>
                    <label className="mt-2 flex items-start gap-3 text-stone-700">
                      <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1 h-5 w-5 accent-teal-800" />
                      <span>{t.consent} <a href="/privacy" className="underline underline-offset-4">{t.privacyLink}</a></span>
                    </label>
                    <button type="button" disabled={!consent || saved === "saving"} onClick={saveProfile} className="mt-3 min-h-11 rounded-xl bg-teal-800 px-4 font-semibold text-white disabled:opacity-50">
                      {t.saveBtn}
                    </button>
                    {saved === "error" && <p className="mt-2 text-red-800">{t.error}</p>}
                  </>
                )}
              </div>
            )}
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
          <span className="flex items-center gap-3">
            <span data-testid="quiz-step">{fill(t.step, { n: step + 1, total: TOTAL })}</span>
            {(step > 0 || JSON.stringify(a) !== JSON.stringify(EMPTY)) && (
              <button type="button" data-testid="quiz-start-over" onClick={startOver} className="min-h-11 px-1 text-stone-500 underline underline-offset-4">
                {t.startOver}
              </button>
            )}
          </span>
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
            <Choice testid="quiz-nycha" on={a.nycha} onClick={() => up("nycha", !a.nycha)}>{t.nycha}</Choice>
            <Choice testid="quiz-municipal" on={a.municipalVet} onClick={() => up("municipalVet", !a.municipalVet)}>{t.municipalVet}</Choice>
            <Choice on={!a.senior && !a.disability && !a.nycha && !a.municipalVet} onClick={() => setA((x) => ({ ...x, senior: false, disability: false, nycha: false, municipalVet: false }))}>{t.none}</Choice>
            <label className="block pt-4">
              <span className="text-base font-semibold text-stone-900">{t.zip}</span>
              <span className="mt-1 block text-sm text-stone-600">{t.zipHelp}</span>
              <input
                data-testid="quiz-zip"
                inputMode="numeric"
                autoComplete="postal-code"
                maxLength={5}
                value={a.zip}
                onChange={(e) => up("zip", e.target.value.replace(/\D/g, "").slice(0, 5))}
                placeholder="10451"
                className="mt-2 min-h-14 w-40 rounded-2xl border-2 border-stone-300 px-4 text-xl tabular-nums outline-none focus:border-teal-700"
              />
            </label>
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
