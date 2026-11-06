// Process every Muse CSV in data/inbox/ automatically, then republish the site data.
//
//   npm run ingest:muse
//
// Files are applied oldest first, moved to data/inbox/processed/, and each run writes
// data/reports/muse-<timestamp>.json listing what was added, updated, held for a
// second read, removed, or quarantined (with the exact problems).
// Exits non-zero only if the pipeline itself breaks, so GitHub emails you then.

import { readdirSync, readFileSync, renameSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import Papa from "papaparse";
import { applyRun, emptyState, type MuseState, type RunReport } from "../src/lib/import/muse";
import type { RawRow } from "../src/lib/import/normalize";
import { PATHS, publish, readJson, writeJson } from "./publish";

function main() {
  mkdirSync(PATHS.inbox, { recursive: true });
  mkdirSync(PATHS.processed, { recursive: true });
  const files = readdirSync(PATHS.inbox)
    .filter((f) => f.toLowerCase().endsWith(".csv"))
    .sort();

  let state = readJson<MuseState>(PATHS.museState, emptyState());
  const now = new Date().toISOString();
  const reports: Array<RunReport & { file: string }> = [];

  for (const file of files) {
    const text = readFileSync(join(PATHS.inbox, file), "utf8").replace(/^﻿/, "");
    const rows = Papa.parse<RawRow>(text, { header: true, skipEmptyLines: true }).data;
    const res = applyRun(state, rows, now);
    state = res.state;
    reports.push({ file, ...res.report });
    renameSync(join(PATHS.inbox, file), join(PATHS.processed, `${now.slice(0, 10)}_${file}`));
    for (const s of res.report.sources) {
      console.log(
        `[${file}] ${s.source}: ${s.status}${s.reason ? ` (${s.reason})` : ""} — +${s.added.length} added, ${s.updated.length} updated, ` +
          `${s.changeAwaitingConfirmation.length} held for 2nd read, ${s.removed.length} removed, ${s.quarantined} quarantined`,
      );
    }
  }

  writeJson(PATHS.museState, state, true);
  if (reports.length) writeJson(join(PATHS.reports, `muse-${now.replace(/[:.]/g, "-")}.json`), reports, true);
  const { total, fromMuse } = publish(now); // also drops stale sources even when there are no new files
  console.log(`Published ${total} listings (${fromMuse} from Muse). Files processed: ${files.length}.`);
}

main();
