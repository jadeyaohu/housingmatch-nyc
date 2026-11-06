import { handleEvents } from "@/lib/analytics/handler";
import { createUpstashLimiter } from "@/lib/analytics/ratelimit";
import { createSupabaseEventStore, storeConfigured } from "@/lib/analytics/store";

// Anonymous analytics ingestion (HN-001 PR1a). Disabled by default; see src/lib/analytics/config.ts.
// Never receives or stores matcher inputs, IPs, user agents or contact details.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const env = process.env;
  return handleEvents(req, {
    env,
    storeConfigured,
    getLimiter: () => createUpstashLimiter(env),
    getStore: () => createSupabaseEventStore(env),
  });
}
