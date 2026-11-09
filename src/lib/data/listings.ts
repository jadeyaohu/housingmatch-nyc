import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import type { Listing } from "../types";
import { rowToListing, type ListingRow } from "./mapping";
import { currentEnvironment, isPublishable, type ApprovedSources } from "./publication";

/**
 * Loads listings from Supabase when configured, otherwise from data/listings.json
 * (the importer's output, or demo rows during development).
 */
async function approvedSources(): Promise<ApprovedSources> {
  try {
    return JSON.parse(await readFile(path.join(process.cwd(), "data", "sources", "approved-sources.json"), "utf8"));
  } catch {
    return { approved: {} }; // fail closed: no Muse source is public without the file
  }
}

/** Listings visible in the current environment (Production hides unapproved Muse sources). */
export async function getListings(): Promise<Listing[]> {
  const [all, sources] = await Promise.all([loadListings(), approvedSources()]);
  const env = currentEnvironment();
  return all.filter((l) => isPublishable(l, sources, env));
}

async function loadListings(): Promise<Listing[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (url && anon) {
    const db = createClient(url, anon, { auth: { persistSession: false } });
    const { data, error } = await db.from("listings").select("*").neq("status", "closed").limit(5000);
    if (error) throw error;
    return (data as ListingRow[]).map(rowToListing);
  }
  const file = await readFile(path.join(process.cwd(), "data", "listings.json"), "utf8");
  // Re-derive open/closed from today's date: the file may be days old.
  const today = todayNY();
  return (JSON.parse(file) as Listing[])
    .map((l) => (l.status === "open" && l.applicationDeadline && l.applicationDeadline < today ? { ...l, status: "closed" as const } : l))
    .map((l) => (l.status === "upcoming" && l.applicationOpenDate && l.applicationOpenDate <= today ? { ...l, status: "open" as const } : l))
    .filter((l) => l.status !== "closed");
}

export function todayNY(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(new Date());
}
