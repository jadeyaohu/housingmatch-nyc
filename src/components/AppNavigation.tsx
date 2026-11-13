"use client";
import Link from "next/link";
import {usePathname}from"next/navigation";
import {useEffect,useRef,useState}from"react";
import {LangToggle}from"./LangToggle";
import {usePreview}from"./preview/PreviewProvider";
import type{Lang}from"@/lib/i18n";
const tabs=[{href:"/listings",en:"Explore",zh:"房源",path:"M3 21V8l9-5 9 5v13M8 21v-6h8v6"},{href:"/account",en:"Profile",zh:"我的",path:"M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8M4 21a8 8 0 0 1 16 0"},{href:"/applications",en:"Applications",zh:"申请",path:"M4 4h16v16H4zM8 8h8M8 12h8m-8 4h5"},{href:"/help",en:"Support",zh:"帮助",path:"M12 17h.01M9 8a3 3 0 0 1 6 0c0 2-3 2-3 5M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20"}];
export function AppNavigation({lang,signedIn}:{lang:Lang;signedIn:boolean}){
 const path=usePathname(),dialog=useRef<HTMLDialogElement>(null),button=useRef<HTMLButtonElement>(null);
 const[open,setOpen]=useState(false),[keyboard,setKeyboard]=useState(false);const preview=usePreview();
 const authed=signedIn||(preview.enabled&&preview.state.signedIn);
 const links=[...tabs.map(t=>({href:t.href,label:lang==="zh"?t.zh:t.en})),{href:"/saved",label:lang==="zh"?"我的收藏":"My Saved"},{href:"/quiz",label:lang==="zh"?"AMI 问卷":"AMI Quiz"},{href:"/chat",label:lang==="zh"?"AI 助手":"Ask AI"},{href:"/notifications",label:lang==="zh"?"邮件提醒":"Email alerts"},{href:"/prepare",label:lang==="zh"?"准备材料":"Get documents ready"},{href:"/pricing",label:lang==="zh"?"订阅方案":"Plans"},{href:"/consultation",label:lang==="zh"?"预约一对一咨询":"Consultation"},{href:"/privacy",label:lang==="zh"?"隐私说明":"Privacy"}];
 const active=(href:string)=>href==="/account"?["/account","/signup","/login","/register","/saved","/notifications","/pricing","/consultation","/prepare"].some(p=>path===p||path.startsWith(p+"/")):href==="/listings"?(path==="/"||path.startsWith("/listings")||path==="/quiz"||path==="/match"):path===href||path.startsWith(href+"/");
 function close(){dialog.current?.close();setOpen(false);button.current?.focus();}
 useEffect(()=>{if(!open)return;const previous=document.body.style.overflow;document.body.style.overflow="hidden";return()=>{document.body.style.overflow=previous;};},[open]);
 useEffect(()=>{dialog.current?.close();},[path]);
 useEffect(()=>{const viewport=window.visualViewport;const check=()=>setKeyboard(!!viewport&&window.innerHeight-viewport.height>160&&/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName??""));viewport?.addEventListener("resize",check);return()=>viewport?.removeEventListener("resize",check);},[]);
 return <>
  <header className="sticky top-0 z-40 border-b border-stone-200 bg-white/95 backdrop-blur">
   <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-3 py-2 md:px-5 md:py-3">
    <Link href="/" aria-label="HousingMatch NYC" className="flex shrink-0 items-center gap-2 font-semibold"><span aria-hidden className="grid size-7 place-items-center rounded-md bg-teal-800 text-white">H</span><span className="text-xs md:text-base">HousingMatch<span className="hidden lg:inline"> NYC</span></span></Link>
    <nav aria-label={lang==="zh"?"桌面导航":"Desktop navigation"} className="hidden items-center gap-3 text-sm md:flex">{[{href:"/listings",label:lang==="zh"?"房源":"Explore"},{href:"/quiz",label:lang==="zh"?"匹配":"Match"},{href:"/chat",label:lang==="zh"?"AI助手":"Ask AI"},{href:"/pricing",label:lang==="zh"?"方案":"Plans"},{href:"/consultation",label:lang==="zh"?"咨询":"Consultation"},{href:"/account",label:lang==="zh"?"我的":"My"}].map(l=><Link key={l.href} href={l.href} aria-current={path===l.href?"page":undefined} className="min-h-11 content-center text-teal-900 aria-[current=page]:font-bold">{l.label}</Link>)}</nav>
    <div className="flex items-center gap-1"><LangToggle lang={lang}/><button ref={button} type="button" aria-label={lang==="zh"?"打开菜单":"Open menu"} aria-expanded={open} aria-controls="app-menu" aria-haspopup="dialog" onClick={()=>{dialog.current?.showModal();setOpen(true);}} className="grid size-11 shrink-0 place-items-center rounded-xl border border-stone-200"><svg aria-hidden viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-5"><path d="M4 6h16M4 12h16M4 18h16"/></svg></button></div>
   </div>
  </header>
  <dialog id="app-menu" aria-labelledby="app-menu-title" aria-modal="true" ref={dialog} onClose={()=>setOpen(false)} onCancel={()=>setOpen(false)} onClick={e=>{if(e.target===e.currentTarget)close();}} className="fixed inset-0 m-0 ml-auto h-dvh max-h-none w-full max-w-sm bg-transparent p-0 backdrop:bg-black/40">
   <div className="flex h-full flex-col bg-white p-5"><div className="flex items-center justify-between"><h2 id="app-menu-title" className="text-lg font-bold">{lang==="zh"?"全部功能":"All features"}</h2><button autoFocus onClick={close} className="min-h-11 min-w-11 rounded-xl border" aria-label={lang==="zh"?"关闭菜单":"Close menu"}>✕</button></div>
    <p className="mt-3 text-sm text-stone-600">{authed?(lang==="zh"?"已登录":"Signed in"):(lang==="zh"?"尚未登录":"Signed out")}{preview.enabled&&preview.state.signedIn?" · DEMO":""}</p>
    <Link href={authed?"/account":"/signup"} onClick={close} className="mt-3 rounded-xl bg-teal-800 p-3 text-center font-semibold text-white">{authed?(lang==="zh"?"我的账号":"My account"):(lang==="zh"?"免费注册 / 登录":"Free signup / login")}</Link>
    <nav aria-label={lang==="zh"?"全部功能":"All features"} className="mt-4 flex-1 overflow-y-auto">{links.map(l=><Link key={l.href} href={l.href} onClick={close} aria-current={path===l.href?"page":undefined} className="block min-h-11 rounded-lg px-3 py-3 text-sm text-teal-900 hover:bg-teal-50 aria-[current=page]:bg-teal-50">{l.label}</Link>)}</nav><LangToggle lang={lang}/>
   </div>
  </dialog>
  <nav aria-label={lang==="zh"?"主导航":"Primary navigation"} data-testid="bottom-navigation" className={`fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-stone-200 bg-white/95 px-2 pt-1 pb-[max(env(safe-area-inset-bottom),0.4rem)] backdrop-blur md:hidden ${keyboard?"invisible pointer-events-none":""}`}>
   {tabs.map(t=><Link key={t.href} href={t.href} aria-current={active(t.href)?"page":undefined} className="flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-xl text-[11px] text-stone-600 aria-[current=page]:bg-teal-50 aria-[current=page]:font-bold aria-[current=page]:text-teal-900"><svg aria-hidden viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="size-5 shrink-0"><path d={t.path}/></svg><span className="block whitespace-nowrap px-1 py-0.5 text-[10px] min-[390px]:text-xs leading-5">{lang==="zh"?t.zh:t.en}</span></Link>)}
  </nav>
 </>;
}
