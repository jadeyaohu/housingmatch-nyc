import { describe, it, expect } from "vitest";
import { matchesProperty, propertyPhotos, propertyPhoto, sourceHosts } from "./property";
import { listingPhotos } from "./model";
const identity = { lotteryId: "7726", propertyName: "Example Apartments", address: "100 Example Street", source: "https://housingconnect.nyc.gov/PublicWeb/details/7726" };
describe("actual property-photo identity", () => {
  it("requires lottery ID, normalized property name and address together", () => {
    const listing = { id: "hc-7726", projectName: "Example Apartments", address: "100 Example Street" };
    expect(matchesProperty(identity, listing)).toBe(true);
    for (const bad of [{ ...identity, lotteryId: "7650" }, { ...identity, propertyName: "Another Building" }, { ...identity, address: "101 Example Street" }, { ...identity, source: "https://housingconnect.nyc.gov/PublicWeb/details/7650" }]) expect(matchesProperty(bad, listing)).toBe(false);
  });
  it("does not substitute unrelated stock photography for an unverified actual property", () => { expect(listingPhotos("hc-7726")).toEqual([]); expect(listingPhotos("hc-7650")).toEqual([]); expect(propertyPhotos()).toEqual([]); });
  it("requires identity review, permission evidence, local optimized pixels and checksum", () => { expect(propertyPhoto.safeParse(identity).success).toBe(false); });
});

it("accepts the Housing Connect CDN as an image source while preserving existing hosts", () => {
  for (const host of ["housingconnect.nyc.gov", "a806-housingconnectapi.nyc.gov", "settlenyc.com", "www.settlenyc.com"]) expect(sourceHosts).toContain(host);
  const input = { id: "hc-7726-main", ...identity, imageUrl: "https://a806-housingconnectapi.nyc.gov/MailTemplates/photos/38859098.png", credit: "NYC Housing Connect", permissionReference: "Founder-asserted verbal authorization: HPD phone call + Settle NYC developer conversation, 2026-11-14; no written document on file.", identityReviewedAt: "2026-11-14T00:00:00Z" };
  expect(propertyPhoto.omit({ src: true, width: true, height: true, sha256: true }).safeParse(input).success).toBe(true);
});
