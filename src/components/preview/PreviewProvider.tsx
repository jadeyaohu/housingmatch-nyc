"use client";
import {createContext,useContext,useState,useEffect,useRef,type ReactNode} from "react";
import {usePathname}from"next/navigation";
import type{DemoProfile}from"@/lib/recommendations/model";
import{documentChannel}from"@/lib/analytics/acquisition";
import type{FunnelEvent}from"@/lib/analytics/funnel";
import{PREVIEW_STORAGE_KEY,readPreviewSnapshot,writePreviewSnapshot}from"@/lib/preview/persistence";
import type{Plan}from"@/lib/subscriptions/model";
export type DemoApplication={id:string;listingId:string;title:string;stage:"unknown"|"awaiting"|"submitted"|"lottery_closed"|"log_number_received"|"under_review"|"selected"|"not_selected";date:string};
export type DemoRequest={id:string;package:"standard"|"expert";language:"en"|"zh";state:"awaiting_payment"|"scheduling_invited"};
export type DemoEvent=FunnelEvent;
type State={signedIn:boolean;profile:DemoProfile;plan:Plan;saved:string[];applications:DemoApplication[];requests:DemoRequest[];alerts:boolean;alertFrequency:"daily"|"weekly";day:string;used:number;analytics:boolean;events:DemoEvent[]};
const initial:State={signedIn:false,profile:"family",plan:"free",saved:[],applications:[],requests:[],alerts:false,alertFrequency:"weekly",day:"",used:0,analytics:false,events:[]};
const Context=createContext<{enabled:boolean;state:State;update:(fn:(old:State)=>State)=>void;record:(event:string,language:"en"|"zh")=>void}|null>(null);
export function PreviewProvider({enabled,children,lang="en"}:{enabled:boolean;children:ReactNode;lang?:"en"|"zh"}){
 const[state,setState]=useState(initial);const[restored,setRestored]=useState(false);const[storageBlocked,setStorageBlocked]=useState(false);
 useEffect(()=>{if(!enabled)return;try{const saved=readPreviewSnapshot(localStorage.getItem(PREVIEW_STORAGE_KEY));if(saved)setState({...initial,...saved,applications:saved.applications.map(a=>({...a,title:"DEMO Housing Opportunity"}))});else localStorage.removeItem(PREVIEW_STORAGE_KEY);}catch{setStorageBlocked(true);}setRestored(true);},[enabled]);
 useEffect(()=>{if(!enabled||!restored)return;try{const{signedIn,profile,plan,saved,day,used,alerts,alertFrequency,requests}=state;localStorage.setItem(PREVIEW_STORAGE_KEY,writePreviewSnapshot({signedIn,profile,plan,saved,day,used,alerts,alertFrequency,requests,applications:state.applications.map(({id,listingId,stage,date})=>({id,listingId,stage,date}))}));}catch{setStorageBlocked(true);}},[enabled,restored,state]);const path=usePathname();const visit=useRef<string|null>(null);
 useEffect(()=>{if(!enabled)return;const event=path==="/"?"landing_visit":path==="/pricing"?"subscription_page_view":null;if(event)setState(s=>!s.analytics?s:{...s,events:[...s.events.slice(-199),{event,language:lang,plan:s.plan,at:new Date().toISOString(),channel:documentChannel(),visit:visit.current??(visit.current=crypto.randomUUID()),origin:"session"}]});},[path,enabled,lang]);
 function record(event:string,language:"en"|"zh"){setState(s=>!s.analytics?s:{...s,events:[...s.events.slice(-199),{event,language,plan:s.plan,at:new Date().toISOString(),channel:documentChannel(),visit:visit.current??(visit.current=crypto.randomUUID()),origin:"session"}]});}
 return <Context.Provider value={{enabled,state,update:setState,record}}>{enabled&&storageBlocked&&<p role="status" className="bg-amber-100 p-4 text-sm font-bold">{lang==="zh"?"浏览器存储不可用：演示资料暂时仅在内存中，刷新会清除。":"Browser storage unavailable: demo data is temporary and will clear on reload."}</p>}{children}</Context.Provider>;
}
export function usePreview(){const ctx=useContext(Context);return ctx??{enabled:false,state:initial,update:()=>{},record:()=>{}};}
export function PreviewNotice({lang}:{lang:"en"|"zh"}){return <aside className="mb-6 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm leading-relaxed text-amber-950" data-testid="demo-notice"><strong>DEMO MODE · </strong>{lang==="zh"?"虚构的预览体验，不是真实账号、Gemini、付款或邮件。虚构账号、收藏、方案和额度仅保存在此浏览器最多七天，可退出清除；不是服务端真实权益。聊天、联系方式、自由文本和统计访问编号不会保存在此演示快照中。请勿输入个人敏感信息。":"Synthetic Preview experience, not real accounts, Gemini, payments or email. Synthetic account, saves, plan and quota stay in this browser for up to seven days; sign out to clear. They are not real server entitlements. Chat, contact details, free text and analytics visit IDs are excluded from the demo snapshot. Do not enter personal information."}</aside>;}
