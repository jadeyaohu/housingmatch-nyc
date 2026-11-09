import { describe, expect, it } from "vitest";
import { isGenericUrl } from "./MatchResults";

describe("isGenericUrl", () => {
  it("flags a site's index or search page", () => {
    expect(isGenericUrl("https://prontohousingrentals.com/listings")).toBe(true);
    expect(isGenericUrl("https://prontohousingrentals.com/listings?metro=nyc")).toBe(true);
    expect(isGenericUrl("https://example.org/")).toBe(true);
  });
  it("keeps specific listing pages", () => {
    expect(isGenericUrl("https://iaffordny.com/re-rentals/2170103")).toBe(false);
    expect(isGenericUrl("https://housingconnect.nyc.gov/PublicWeb/details/7718")).toBe(false);
    expect(isGenericUrl("https://prontohousingrentals.com/listings/eastchester-heights")).toBe(false);
    expect(isGenericUrl(null)).toBe(false);
  });
});
