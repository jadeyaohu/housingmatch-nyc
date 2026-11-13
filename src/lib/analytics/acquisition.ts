export const CHANNELS=["direct","organic_search","social","email","paid_campaign","referral"]as const;
export type Channel=typeof CHANNELS[number];
/** Map locally to a fixed bucket. Never return URLs, campaign text, IDs or arbitrary query values. */
export function acquisitionChannel(search:string,referrer:string,origin:string):Channel{
 const medium=new URLSearchParams(search).get('utm_medium')?.toLowerCase();
 if(medium==='email')return'email';if(['social','social_media','social-network','paid_social'].includes(medium??''))return'social';
 if(['cpc','ppc','paid','display','affiliate'].includes(medium??''))return'paid_campaign';if(medium==='organic')return'organic_search';if(medium==='referral')return'referral';
 try{if(!referrer)return'direct';const u=new URL(referrer);if(u.origin===origin)return'direct';if(['www.google.com','google.com','www.bing.com','bing.com','duckduckgo.com','www.duckduckgo.com'].includes(u.hostname))return'organic_search';return'referral';}catch{return'direct';}
}
let observed:Channel|undefined;
/** Called only after consent; SPA navigation keeps the first observed document bucket. */
export function documentChannel():Channel{return observed??=(typeof window==='undefined'?'direct':acquisitionChannel(window.location.search,document.referrer,window.location.origin));}
