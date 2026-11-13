import{describe,it,expect}from'vitest';import{funnelSummary,sampleFunnel,type FunnelEvent}from'./funnel';
const event=(name:string,visit:string):FunnelEvent=>({event:name,visit,at:'2026-11-12T12:00:00Z',channel:'email',language:'en',plan:'basic',origin:'session'});
describe('observed visit conversion',()=>{
 it('deduplicates steps within a visit but preserves event volume',()=>{const result=funnelSummary([event('landing_visit','one'),event('account_registration','one'),event('account_registration','one')]);expect(result.visits).toBe(1);expect(result.signupShare).toBe(1);expect(result.rows.find(r=>r.event==='account_registration')).toMatchObject({count:2,visits:1});});
 it('never counts an activation in an unrelated visit as a converted checkout',()=>{const result=funnelSummary([event('checkout_initiated','one'),event('subscription_activated','two')]);expect(result.checkoutConversion).toBe(0);expect(funnelSummary([]).checkoutConversion).toBeNull();});
 it('generates explicitly synthetic samples with no future timestamps',()=>{const now=new Date('2026-11-12T12:00:00Z'),rows=sampleFunnel(now),result=funnelSummary(rows);expect(result.visits).toBe(12);expect(result.checkoutConversion).toBe(.5);expect(rows.every(r=>r.origin==='sample'&&Date.parse(r.at)<=now.getTime())).toBe(true);});
});
