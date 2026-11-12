"use client";
import { trackEvent } from "@/lib/analytics/events";
import { useState } from "react";
import { browserClient } from "@/lib/supabase/browser";
import type { AuthConfig } from "@/lib/supabase/config";
import type { Lang } from "@/lib/i18n";

const L = {
  en: { save: "Save", saved: "Saved", error: "Couldn't save. Try again." },
  zh: { save: "收藏", saved: "已收藏", error: "收藏失败，请重试。" },
} as const;

/** Save / unsave a listing for the signed-in user. Stores only the listing id. */
export function SaveButton({ cfg, listingId, initial, lang, onChange }: { cfg: AuthConfig; listingId: string; initial: boolean; lang: Lang; onChange?: (saved: boolean) => void }) {
  const t = L[lang];
  const [saved, setSaved] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(false);

  async function toggle() {
    setBusy(true);
    setErr(false);
    const sb = browserClient(cfg);
    const { data } = await sb.auth.getUser();
    if (!data.user) return setBusy(false), setErr(true);
    const q = saved
      ? sb.from("saved_listings").delete().eq("user_id", data.user.id).eq("listing_id", listingId)
      : sb.from("saved_listings").insert({ user_id: data.user.id, listing_id: listingId });
    const { error } = await q;
    setBusy(false);
    if (error && !(error.code === "23505")) return setErr(true); // 23505 = already saved
    if (!saved && !error) trackEvent({ event: "listing_saved", language: lang });
    setSaved(!saved);
    onChange?.(!saved);
  }

  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        data-testid={`save-${listingId}`}
        aria-pressed={saved}
        disabled={busy}
        onClick={toggle}
        className={`inline-flex min-h-11 items-center gap-1.5 rounded-xl border px-3 text-sm font-semibold disabled:opacity-60 ${saved ? "border-rose-300 bg-rose-50 text-rose-900" : "border-stone-300 bg-white text-stone-800 hover:bg-stone-50"}`}
      >
        <span aria-hidden>{saved ? "♥" : "♡"}</span>
        {saved ? t.saved : t.save}
      </button>
      {err && <span className="text-xs text-red-800">{t.error}</span>}
    </span>
  );
}
