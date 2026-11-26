// Publication gate: collected data is not automatically public.
//
// Muse (automated collection) records reach Production only if their source has been approved
// in data/sources/approved-sources.json. Preview and local builds show every source so new
// batches can be audited. Explicit Open Data/manual records are trusted; records whose
// provenance was lost (for example by the legacy Supabase mapper) fail closed in Production.

import type { Listing } from "../types";

export interface ApprovedSources {
  approved: Record<string, { approvedOn: string; by: string; basis: string }>;
  pending?: Record<string, string>;
}

export type Environment = "production" | "preview" | "development";

export function currentEnvironment(env: NodeJS.ProcessEnv = process.env): Environment {
  if (env.VERCEL_ENV === "production") return "production";
  if (env.VERCEL_ENV === "preview") return "preview";
  return "development";
}

export function isPublishable(l: Listing, sources: ApprovedSources, environment: Environment): boolean {
  if (environment !== "production") return true;
  if (l.dataSource === "opendata" || l.dataSource === "manual") return true;
  if (l.dataSource !== "muse") return false;
  return l.sourceName != null && Object.prototype.hasOwnProperty.call(sources.approved, l.sourceName);
}
