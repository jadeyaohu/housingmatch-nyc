"use client";
import { useEffect, useState } from "react";
import type { Lang } from "@/lib/i18n";

export interface DocGroup {
  id: string;
  title: string;
  when?: string;
  items: { id: string; text: string }[];
}

const STORE = "hm-docs-v1"; // ticks stay on this device only

export function DocChecklist({ groups, lang }: { groups: DocGroup[]; lang: Lang }) {
  const [done, setDone] = useState<Record<string, boolean>>({});
  useEffect(() => {
    try {
      setDone(JSON.parse(localStorage.getItem(STORE) ?? "{}"));
    } catch {}
  }, []);
  const toggle = (id: string) =>
    setDone((d) => {
      const n = { ...d, [id]: !d[id] };
      try {
        localStorage.setItem(STORE, JSON.stringify(n));
      } catch {}
      return n;
    });
  const total = groups.reduce((s, g) => s + g.items.length, 0);
  const count = groups.reduce((s, g) => s + g.items.filter((i) => done[`${g.id}.${i.id}`]).length, 0);

  return (
    <div>
      <p data-testid="doc-progress" className="sticky top-0 z-10 -mx-4 bg-stone-50/95 px-4 py-2 text-sm font-medium text-stone-700 backdrop-blur print:hidden">
        {lang === "zh" ? `已准备 ${count} / ${total} 项` : `${count} of ${total} ready`}
      </p>
      {groups.map((g) => (
        <section key={g.id} data-testid={`docs-${g.id}`} className="mt-6 break-inside-avoid">
          <h2 className="text-lg font-semibold text-stone-900">{g.title}</h2>
          {g.when && <p className="mt-1 text-sm text-stone-600">{g.when}</p>}
          <ul className="mt-2 space-y-2">
            {g.items.map((i) => {
              const k = `${g.id}.${i.id}`;
              return (
                <li key={k}>
                  <label className="flex min-h-11 cursor-pointer items-start gap-3 rounded-xl border border-stone-200 bg-white p-3 text-sm text-stone-800">
                    <input type="checkbox" checked={!!done[k]} onChange={() => toggle(k)} className="mt-0.5 h-5 w-5 shrink-0 accent-teal-800" />
                    <span className={done[k] ? "text-stone-500 line-through" : ""}>{i.text}</span>
                  </label>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
