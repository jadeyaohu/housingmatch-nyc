"use client";
import { useState } from "react";
import { BOROUGHS, UNIT_TYPES, type Borough, type UnitType } from "@/lib/types";
import { boroughLabel, dict, unitLabel, type Lang } from "@/lib/i18n";
import { MatchResults, type Row } from "./MatchResults";

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
      setRows((await res.json()).results);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }


  return (
    <div className="grid gap-10 lg:grid-cols-[400px_1fr]">
      <form onSubmit={submit} className="h-fit space-y-6 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
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
        {rows && <MatchResults rows={rows} lang={lang} />}
      </section>
    </div>
  );
}
