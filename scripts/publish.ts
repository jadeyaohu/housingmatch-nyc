// Shared by the importers: merge all sources into data/listings.json (what the site reads).
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { emptyState, liveMuseListings, mergeSources, type MuseState } from "../src/lib/import/muse";
import type { Listing } from "../src/lib/types";

export const PATHS = {
  openData: "data/sources/opendata.json",
  museState: "data/sources/muse-state.json",
  listings: "data/listings.json",
  inbox: "data/inbox",
  processed: "data/inbox/processed",
  reports: "data/reports",
};

export function readJson<T>(path: string, fallback: T): T {
  return existsSync(path) ? (JSON.parse(readFileSync(path, "utf8")) as T) : fallback;
}

export function writeJson(path: string, value: unknown, pretty = false) {
  mkdirSync(path.split("/").slice(0, -1).join("/"), { recursive: true });
  writeFileSync(path, JSON.stringify(value, null, pretty ? 2 : undefined) + "\n");
}

export function publish(now = new Date().toISOString()): { total: number; fromMuse: number } {
  const openData = readJson<Listing[]>(PATHS.openData, []);
  const state = readJson<MuseState>(PATHS.museState, emptyState());
  const muse = liveMuseListings(state, now);
  const merged = mergeSources(openData, muse);
  writeJson(PATHS.listings, merged);
  return { total: merged.length, fromMuse: muse.length };
}
