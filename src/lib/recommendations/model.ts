import type{Row}from"@/components/MatchResults";
import{isSecondary}from"@/lib/availability";
export const DEMO_PROFILES={
 single:{size:1,annualIncome:45000,rentMax:1400},
 family:{size:3,annualIncome:60000,rentMax:1800},
 larger:{size:4,annualIncome:95000,rentMax:2500},
}as const;
export type DemoProfile=keyof typeof DEMO_PROFILES;
export type MatchProfile={size:number;annualIncome:number;rentMax:number|null;boroughs?:string[];bedrooms?:string[];hasVoucher?:boolean};
/** Only primary opportunities; income eligibility and budget fit remain distinct facts. */
export function recommendationRows(rows:Row[],limit=3){
 return rows.filter(r=>!isSecondary(r.listing)&&r.availability!=="confirmed_closed"&&r.result.status!=="UNLIKELY_MATCH")
 .sort((a,b)=>Number(b.result.status==="LIKELY_MATCH")-Number(a.result.status==="LIKELY_MATCH")||Number(a.lifestyle?.budget==="no")-Number(b.lifestyle?.budget==="no")||a.listing.projectName.localeCompare(b.listing.projectName)).slice(0,limit);
}
