import { z } from "zod";
import catalog from "./property-assets.json";
export const sourceHosts = ["housingconnect.nyc.gov", "www.settlenyc.com", "settlenyc.com"];
const publicSource = z.url().refine(value => { const u = new URL(value); return u.protocol === "https:" && sourceHosts.includes(u.hostname) && !u.username && !u.password && !u.search && !u.hash && (!u.port || u.port === "443"); });
export const propertyPhoto = z.object({
  id: z.string().regex(/^[a-z0-9_-]{1,100}$/), lotteryId: z.string().regex(/^\d+$/),
  propertyName: z.string().min(1).max(300), address: z.string().min(1).max(300),
  source: publicSource, imageUrl: publicSource, credit: z.string().min(1).max(300),
  permissionReference: z.string().min(1).max(500), identityReviewedAt: z.iso.datetime(),
  src: z.string().regex(/^\/images\/properties\/[a-z0-9_-]+\.webp$/),
  width: z.number().int().min(400).max(2400), height: z.number().int().min(300).max(2400), sha256: z.string().regex(/^[a-f0-9]{64}$/),
}).strict();
export type PropertyPhoto = z.infer<typeof propertyPhoto>;
export function propertyPhotos(listingId?: string) {
  return z.array(propertyPhoto).max(200).parse(catalog).filter(p => !listingId || listingId === `hc-${p.lotteryId}`);
}
const normalize = (text: string) => text.normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
export function matchesProperty(photo: Pick<PropertyPhoto, "lotteryId" | "propertyName" | "address" | "source">, listing: { id: string; projectName: string; address?: string | null }) {
  if (listing.id !== `hc-${photo.lotteryId}` || !listing.address || normalize(listing.projectName) !== normalize(photo.propertyName) || normalize(listing.address) !== normalize(photo.address)) return false;
  const url = new URL(photo.source);
  return url.hostname !== "housingconnect.nyc.gov" || url.pathname === `/PublicWeb/details/${photo.lotteryId}`;
}
