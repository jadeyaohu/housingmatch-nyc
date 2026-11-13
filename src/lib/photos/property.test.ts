import { describe, it, expect } from "vitest";
import { matchesProperty, propertyPhotos, propertyPhoto } from "./property";
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
