/** Explicit local import of reviewed PUBLIC provider media. Never scrapes applicants or writes a DB. */
import { readFile, writeFile, mkdtemp, mkdir, rename } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import sharp from "sharp";
import { z } from "zod";
import { propertyPhoto, matchesProperty, sourceHosts } from "../src/lib/photos/property";
import { downloadApprovedPhoto } from "../src/lib/photos/download";
async function main() {
  const inputPath = process.argv[2];
  if (!inputPath) throw Error("reviewed_property_media_required");
  const input = await readFile(inputPath, "utf8"); if (input.length > 512000) throw Error("input_too_large");
  const rows = z.array(propertyPhoto.omit({ src: true, width: true, height: true, sha256: true })).min(1).max(200).parse(JSON.parse(input));
  if (new Set(rows.map(p => p.id)).size !== rows.length) throw Error("duplicate_asset_id");
  const listings = JSON.parse(await readFile("data/listings.json", "utf8")) as { id: string; projectName: string; address?: string }[];
  for (const row of rows) { if (Date.parse(row.identityReviewedAt) > Date.now()) throw Error("future_identity_review"); const listing = listings.find(l => l.id === `hc-${row.lotteryId}`); if (!listing || !matchesProperty(row, listing)) throw Error("property_identity_mismatch"); }
  const staging = await mkdtemp(path.join(tmpdir(), "hm-property-photos-")), output = [];
  for (const row of rows) {
    const { data } = await downloadApprovedPhoto(row.imageUrl, fetch, sourceHosts);
    const file = path.join(staging, `${row.id}.webp`);
    const info = await sharp(data, { limitInputPixels: 64000000 }).rotate().resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true }).webp({ quality: 83 }).toFile(file);
    const bytes = await readFile(file);
    const hash = createHash("sha256").update(bytes).digest("hex");
    output.push(propertyPhoto.parse({ ...row, src: `/images/properties/${row.id}-${hash.slice(0,12)}.webp`, width: info.width, height: info.height, sha256: hash }));
  }
  // Publish the reviewed batch only after every download/identity/decode succeeds.
  await mkdir("public/images/properties", { recursive: true });
  for (const row of output) await rename(path.join(staging, `${row.id}.webp`), `public${row.src}`);
  await writeFile("src/lib/photos/property-assets.json", JSON.stringify(output, null, 2) + "\n");
  console.log(`${output.length} reviewed provider assets optimized; inspect all pixels before committing. No deploy or database write.`);
}
main().catch(error => { console.error(error instanceof Error && /^[a-z_]+$/.test(error.message) ? error.message : "property_media_import_failed"); process.exitCode = 1; });
