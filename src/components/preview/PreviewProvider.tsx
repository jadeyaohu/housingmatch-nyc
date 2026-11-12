"use client";
import {createContext,useContext,useState,useEffect,type ReactNode} from "react";
import {usePathname}from"next/navigation";
import type{Plan}from"@/lib/subscriptions/model";
export type DemoApplication={id:string;listingId:string;title:string;stage:"unknown"|"awaiting"|"submitted"|"lottery_closed"|"log_number_received"|"under_review"|"selected"|"not_selected";date:string};
export type DemoRequest={id:string;package:"standard"|"expert";language:"en"|"zh";state:"awaiting_payment"|"scheduling_invited"};
export type DemoEvent={event:string;language:"en"|"zh";plan:Plan;at:string};
type State={signedIn:boolean;plan:Plan;saved:string[];applications:DemoApplication[];requests:DemoRequest[];alerts:boolean;alertFrequency:"daily"|"weekly";day:string;used:number;analytics:boolean;events:DemoEvent[]};
const initial:State={signedIn:false,plan:"free",saved:[],applications:[],requests:[],alerts:false,alertFrequency:"weekly",day:"",used:0,analytics:false,events:[]};
const Context=createContext<{enabled:boolean;state:State;update:(fn:(old:State)=>State)=>void;record:(event:string,language:"en"|"zh")=>void}|null>(null);
export function PreviewProvider({enabled,children,lang="en"}:{enabled:boolean;children:ReactNode;lang?:"en"|"zh"}){
 const[state,setState]=useState(initial);const path=usePathname();
 useEffect(()=>{if(!enabled)return;const event=path==="/"?"landing_visit":path==="/pricing"?"subscription_page_view":null;if(event)setState(s=>!s.analytics?s:{...s,events:[...s.events.slice(-199),{event,language:lang,plan:s.plan,at:new Date().toISOString()}]});},[path,enabled,lang]);
 function record(event:string,language:"en"|"zh"){setState(s=>!s.analytics?s:{...s,events:[...s.events.slice(-199),{event,language,plan:s.plan,at:new Date().toISOString()}]});}
 return <Context.Provider value={{enabled,state,update:setState,record}}>{children}</Context.Provider>;
}
export function usePreview(){const ctx=useContext(Context);return ctx??{enabled:false,state:initial,update:()=>{},record:()=>{}};}
export function PreviewNotice({lang}:{lang:"en"|"zh"}){return <aside className="mb-6 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm leading-relaxed text-amber-950" data-testid="demo-notice"><strong>DEMO MODE · </strong>{lang==="zh"?"虚构的预览体验，不是真实账号、Gemini、付款或邮件。资料仅保留在当前页面会话内存中，刷新会清除。请勿输入个人敏感信息。":"Synthetic Preview experience, not real accounts, Gemini, payments or email. Data stays only in this page session's memory and clears on reload. Do not enter personal information."}</aside>;}
