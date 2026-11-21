import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Listing } from "@/lib/types";
import { listingToRow, rowToListing } from "@/lib/data/mapping";
import { F3, HH_3_85K, TODAY } from "@/lib/matching/fixtures/hn5";

const data = vi.hoisted(() => ({ listings: [] as Listing[] }));
vi.mock("@/lib/data/listings", () => ({ getListings: async () => data.listings, todayNY: () => "2026-11-06" }));
import { POST } from "./route";

const post = () => POST(new Request("https://example.test/api/match", {
  method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(HH_3_85K),
}));

beforeEach(() => { data.listings = []; });

describe("primary lottery / secondary opportunity boundary", () => {
  it("never counts canonical or legacy re-rentals and waiting lists as primary matches", async () => {
    const rerental: Listing = { ...F3, id: "synthetic-rerental", listingType: "rerental", isRerental: true, collectedAt: `${TODAY}T15:00:00Z` };
    const waitlist: Listing = { ...rerental, id: "synthetic-waitlist", listingType: "waitlist" };
    const legacy = rowToListing(listingToRow({ ...rerental, id: "synthetic-legacy", lastVerifiedAt: TODAY }));
    data.listings = [F3, rerental, waitlist, legacy];
    const response = await post();
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.results.map((r: { listing: Listing }) => r.listing.id)).toEqual([F3.id]);
    expect(body.rerentals.map((r: { listing: Listing }) => r.listing.id).sort()).toEqual([legacy.id, rerental.id, waitlist.id].sort());
    expect(body.rerentals).toHaveLength(3);
  });

  it("does not advertise a deadline-less lottery as verified open", async () => {
    data.listings = [{ ...F3, applicationDeadline: null }];
    const body = await (await post()).json();
    expect(body.results).toHaveLength(1);
    expect(body.results[0].availability).toBe("unverified");
    expect(body.rerentals).toEqual([]);
  });
});
