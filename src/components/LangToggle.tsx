"use client";
import { useRouter } from "next/navigation";
import type { Lang } from "@/lib/i18n";

export function LangToggle({ lang }: { lang: Lang }) {
  const router = useRouter();
  const set = (l: Lang) => {
    document.cookie = `lang=${l}; path=/; max-age=31536000; samesite=lax`;
    router.refresh();
  };
  return (
    <div className="flex shrink-0 whitespace-nowrap rounded-full border border-stone-300 p-0.5 text-sm" role="group" aria-label="Language">
      {(["en", "zh"] as const).map((l) => (
        <button
          key={l}
          onClick={() => set(l)}
          aria-pressed={lang === l}
          className={`rounded-full px-2.5 py-1 transition sm:px-3 ${lang === l ? "bg-teal-800 text-white" : "text-stone-600 hover:text-stone-900"}`}
        >
          {l === "en" ? "EN" : "中文"}
        </button>
      ))}
    </div>
  );
}
