import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Env } from "./config";
import type { EventRow } from "./schema";

/**
 * Server-only writer for public.analytics_events.
 * Uses SUPABASE_SERVICE_ROLE_KEY, which must never be NEXT_PUBLIC_ and never reaches the browser.
 * Duplicate event_ids are ignored, so client retries are idempotent.
 */
export interface EventStore {
  insert(rows: EventRow[]): Promise<void>;
}

export function storeConfigured(env: Env): boolean {
  return Boolean(env.NEXT_PUBLIC_SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY);
}

export function createSupabaseEventStore(env: Env): EventStore {
  const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL!, env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return {
    async insert(rows) {
      const { error } = await db.from("analytics_events").upsert(rows, { onConflict: "event_id", ignoreDuplicates: true });
      if (error) throw new Error("analytics_insert_failed");
    },
  };
}
