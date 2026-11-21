// @vitest-environment jsdom
import{afterEach,describe,it,expect,vi}from'vitest';import{act,renderHook,waitFor,cleanup}from'@testing-library/react';
import{useRecommendations}from'./Recommendations';import{DEMO_PROFILES,type MatchProfile}from'@/lib/recommendations/model';import{syntheticListings}from'@/lib/testing/listings';
afterEach(()=>{cleanup();vi.unstubAllGlobals();});
describe('recommendation profile changes',()=>{it('rejects a stale earlier response and keeps profile inputs out of URLs/Referer',async()=>{
 let first!:(v:unknown)=>void,second!:(v:unknown)=>void;const fetcher=vi.fn().mockImplementationOnce(()=>new Promise(r=>first=r)).mockImplementationOnce(()=>new Promise(r=>second=r));vi.stubGlobal('fetch',fetcher);
 const {result,rerender}=renderHook(({profile}:{profile:MatchProfile})=>useRecommendations(profile),{initialProps:{profile:{...DEMO_PROFILES.family} as MatchProfile}});
 await waitFor(()=>expect(fetcher).toHaveBeenCalledTimes(1));expect(fetcher.mock.calls[0][0]).toBe('/api/match');expect(fetcher.mock.calls[0][1]).toMatchObject({referrerPolicy:'no-referrer',credentials:'same-origin',method:'POST'});
 const signal=fetcher.mock.calls[0][1].signal as AbortSignal;rerender({profile:{size:1,annualIncome:45000,rentMax:1400}});await waitFor(()=>expect(fetcher).toHaveBeenCalledTimes(2));expect(signal.aborted).toBe(true);
 const response=(id:string)=>({ok:true,json:async()=>({results:[{listing:{...syntheticListings('2026-11-12')[0],id},result:{status:'LIKELY_MATCH',outcomes:[]}}]})});
 await act(async()=>second(response('new-profile')));await waitFor(()=>expect(result.current.rows[0].listing.id).toBe('new-profile'));
 await act(async()=>first(response('stale-profile')));expect(result.current.rows[0].listing.id).toBe('new-profile');
});});
