import { describe, expect, it } from "vitest";
import { syntheticListings } from "../testing/listings";
import { directoryListings, directoryParams, safeProviderURL } from "./search";
const today="2026-11-11", fixtures=syntheticListings(today);
describe("directory",()=>{
  it("searches without mixing secondary records or counting closed offers",()=>{
    expect(directoryListings(fixtures,{},today)).toHaveLength(2);
    expect(directoryListings(fixtures,{q:"cedar",borough:"Bronx",unit:"3 BR"},today).map(l=>l.id)).toEqual(["demo-exact"]);
    expect(directoryListings(fixtures,{q:"皇后区"},today).map(l=>l.id)).toEqual(["demo-range"]);
    expect(directoryListings(fixtures,{type:"rerental"},today).map(l=>l.id)).toEqual(["demo-rerental"]);
    expect(directoryListings(fixtures.map(l=>({...l,status:"closed"})),{},today)).toHaveLength(0);
  });
  it("normalizes duplicate query parameters without throwing",()=>{
    expect(directoryParams({q:["a","b"],unit:["1br","2br"]})).toMatchObject({q:undefined,unit:undefined});
  });
  it("rejects unsafe provider links and embedded credentials",()=>{
    for(const v of ["javascript:alert(1)","http://example.test","https://user:secret@example.test",null])expect(safeProviderURL(v)).toBeNull();
    expect(safeProviderURL("https://housingconnect.nyc.gov/PublicWeb/")).toBeTruthy();
  });
});
