import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { authConfig } from "./config";

export async function serverClient() {
  const cfg = authConfig();
  if (!cfg) return null;
  const store = await cookies();
  return createServerClient(cfg.url, cfg.key, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          list.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {
          // called from a Server Component; the middleware-less setup refreshes on the next route call
        }
      },
    },
  });
}

export async function currentUser() {
  const sb = await serverClient();
  if (!sb) return null;
  const { data } = await sb.auth.getUser();
  return data.user ?? null;
}
