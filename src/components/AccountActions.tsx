"use client";
import { useState } from "react";
import { browserClient } from "@/lib/supabase/browser";
import type { AuthConfig } from "@/lib/supabase/config";

export function AccountActions({ cfg, labels }: { cfg: AuthConfig; labels: { signOut: string; del: string; confirm: string; deleted: string } }) {
  const [msg, setMsg] = useState<string | null>(null);
  const sb = browserClient(cfg);
  return (
    <div className="mt-6 flex flex-wrap gap-3">
      <button
        type="button"
        onClick={async () => {
          await sb.auth.signOut();
          window.location.href = "/";
        }}
        className="min-h-11 rounded-xl border-2 border-stone-300 px-4 font-semibold text-stone-800"
      >
        {labels.signOut}
      </button>
      <button
        type="button"
        data-testid="delete-profile"
        onClick={async () => {
          if (!window.confirm(labels.confirm)) return;
          const { data } = await sb.auth.getUser();
          if (!data.user) return;
          const { error } = await sb.from("household_profiles").delete().eq("user_id", data.user.id);
          if (!error) {
            try { localStorage.removeItem("hm-quiz-v1"); } catch {}
            setMsg(labels.deleted);
            window.location.reload();
          }
        }}
        className="min-h-11 rounded-xl border-2 border-rose-300 px-4 font-semibold text-rose-800"
      >
        {labels.del}
      </button>
      {msg && <p className="w-full text-sm text-stone-600">{msg}</p>}
    </div>
  );
}
