// Import lottery records into data/listings.json (and optionally Supabase).
//
//   npm run import -- --opendata data/opendata/lotteries.csv data/opendata/buildings.csv
//   npm run import -- --fetch                 # download the latest Open Data CSVs first
//   npm run import -- path/to/other.csv|json  # generic format (see src/lib/import/normalize.ts)
//   add --supabase to also upsert into Supabase (needs NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY)
//
// Nothing missing is filled in. Review data/import-report.json after each run.

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { extname, resolve } from "node:path";
import Papa from "papaparse";
import { normalizeRows, type ImportIssue, type RawRow } from "../src/lib/import/normalize";
import { fromOpenData, OPEN_DATA, zipDistricts } from "../src/lib/import/opendata";
import { listingToRow } from "../src/lib/data/mapping";
import type { Listing } from "../src/lib/types";
import { PATHS, publish, writeJson } from "./publish";

const parseCsv = (text: string) => Papa.parse<RawRow>(text, { header: true, skipEmptyLines: true }).data;

async function download(url: string, to: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed (${res.status}) for ${url}`);
  const text = await res.text();
  writeFileSync(to, text);
  return text;
}

async function main() {
  const args = process.argv.slice(2);
  const flags = new Set(args.filter((a) => a.startsWith("--")));
  const files = args.filter((a) => !a.startsWith("--"));
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(new Date());

  let listings: Listing[];
  let issues: ImportIssue[] = [];
  let rowsRead: number;
  let source: string;

  if (flags.has("--fetch") || flags.has("--opendata")) {
    mkdirSync("data/opendata", { recursive: true });
    const [lotPath = "data/opendata/lotteries.csv", bldPath = "data/opendata/buildings.csv"] = files;
    const lotText = flags.has("--fetch") ? await download(OPEN_DATA.lotteriesCsv, lotPath) : readFileSync(resolve(lotPath), "utf8");
    const bldText = flags.has("--fetch") ? await download(OPEN_DATA.buildingsCsv, bldPath) : readFileSync(resolve(bldPath), "utf8");
    const lotteryRows = parseCsv(lotText);
    rowsRead = lotteryRows.length;
    const buildingRows = parseCsv(bldText);
    listings = fromOpenData(lotteryRows, buildingRows, today);
    writeFileSync("src/lib/data/zip-districts.json", JSON.stringify(zipDistricts(lotteryRows, buildingRows)) + "\n");
    source = "NYC Open Data vy5i-a666 + nibs-na6y";
    for (const l of listings) {
      if (!l.applicationDeadline) issues.push({ row: 0, field: "applicationDeadline", message: `${l.id}: no end date` });
      if (l.incomeBands.length === 0) issues.push({ row: 0, field: "incomeBands", message: `${l.id}: no income categories` });
    }
  } else {
    const [file] = files;
    if (!file) {
      console.error("Usage: npm run import -- --opendata [lotteries.csv buildings.csv] | --fetch | <file.csv|file.json>  [--supabase]");
      process.exit(1);
    }
    const text = readFileSync(resolve(file), "utf8");
    let rows: RawRow[];
    if (extname(file).toLowerCase() === ".json") {
      const parsed = JSON.parse(text);
      rows = Array.isArray(parsed) ? parsed : (parsed.data ?? parsed.records ?? []);
    } else rows = parseCsv(text);
    rowsRead = rows.length;
    ({ listings, issues } = normalizeRows(rows, today));
    source = file;
  }

  if (listings.length === 0) {
    console.error(`No listings parsed from ${rowsRead} rows — site data left unchanged.`);
    process.exit(1);
  }

  writeJson(PATHS.openData, listings);
  const published = publish();
  const count = (s: string) => listings.filter((l) => l.status === s).length;
  const summary = { importedAt: today, source, rowsRead, imported: listings.length, open: count("open"), upcoming: count("upcoming"), closed: count("closed"), unknown: count("unknown") };
  writeFileSync("data/import-report.json", JSON.stringify({ ...summary, issues }, null, 2));
  console.log(summary, `→ site now has ${published.total} listings (${published.fromMuse} from Muse)`);

  if (flags.has("--supabase")) {
    const { createClient } = await import("@supabase/supabase-js");
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
    const db = createClient(url, key, { auth: { persistSession: false } });
    for (let i = 0; i < listings.length; i += 500) {
      const { error } = await db.from("listings").upsert(listings.slice(i, i + 500).map(listingToRow), { onConflict: "id" });
      if (error) throw error;
    }
    console.log(`Upserted ${listings.length} listings into Supabase.`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
