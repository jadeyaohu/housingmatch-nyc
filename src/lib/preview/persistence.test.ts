import{describe,it,expect}from'vitest';import{readPreviewSnapshot,writePreviewSnapshot}from'./persistence';
const state={signedIn:true,profile:'family' as const,plan:'basic' as const,saved:['hc-123'],day:'2026-11-12',used:3,alerts:true,alertFrequency:'weekly' as const,requests:[],applications:[]};
describe('Preview-only synthetic snapshot contract',()=>{
 it('round-trips bounded account/saves/plan/day/quota and expires after seven days',()=>{const raw=writePreviewSnapshot(state,1000);expect(readPreviewSnapshot(raw,1001)).toMatchObject(state);expect(readPreviewSnapshot(raw,1000+8*86400000)).toBeNull();});
 it('never accepts contact/chat/analytics/visit fields, overlarge lists or unbounded quotas',()=>{for(const extra of[{email:'test@example.test'},{chat:'private'},{visit_id:'id'},{events:[]},{used:100},{saved:Array(51).fill('hc-1')}])expect(readPreviewSnapshot(JSON.stringify({...JSON.parse(writePreviewSnapshot(state)),...extra}))).toBeNull();});
 it('fails closed on malformed, oversized, expired and unknown-version data',()=>{for(const raw of['bad-json','x'.repeat(40000),JSON.stringify({version:2}),null])expect(readPreviewSnapshot(raw)).toBeNull();});
});
