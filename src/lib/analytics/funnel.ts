import type{Channel}from'./acquisition';
export const FUNNEL_EVENTS=['landing_visit','ami_quiz_complete','account_registration','listing_saved','chatbot_message','subscription_page_view','checkout_initiated','subscription_activated']as const;
export type FunnelEvent={event:string;visit:string;at:string;channel:Channel;language:'en'|'zh';plan:'free'|'basic'|'smart';origin:'session'|'sample'};
export function funnelSummary(events:FunnelEvent[]){
 const ids=(event?:string)=>new Set(events.filter(e=>!event||e.event===event).map(e=>e.visit));
 const visits=ids().size,registrations=ids('account_registration'),checkouts=ids('checkout_initiated'),activations=ids('subscription_activated');
 return{visits,events:events.length,rows:FUNNEL_EVENTS.map(event=>({event,count:events.filter(e=>e.event===event).length,visits:ids(event).size})),signupShare:visits?registrations.size/visits:null,checkoutConversion:checkouts.size?[...checkouts].filter(id=>activations.has(id)).length/checkouts.size:null};
}
export function sampleFunnel(now=new Date()):FunnelEvent[]{
 const channels:Channel[]=['direct','organic_search','social','email','paid_campaign','referral'];
 return Array.from({length:12},(_,i)=>FUNNEL_EVENTS.slice(0,[8,8,7,7,6,5,4,3,2,2,1,1][i]).map(event=>({event,visit:`sample-visit-${i}`,at:new Date(now.getTime()-(i%3)*86400000).toISOString(),channel:channels[i%channels.length],language:i%2?'zh' as const:'en' as const,plan:i%3?'basic' as const:'smart' as const,origin:'sample' as const}))).flat();
}
