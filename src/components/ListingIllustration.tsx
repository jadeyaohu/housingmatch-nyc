import type { Lang } from "@/lib/i18n";
/** Original neutral graphic. No third-party property image or license is inferred. */
export function ListingIllustration({ lang,layout="card" }: { lang: Lang;layout?:"card"|"detail"|"hero" }) {
  return <figure className={`relative overflow-hidden bg-gradient-to-br from-teal-50 to-stone-100 ${layout==="card"?"aspect-[4/3]":"aspect-video"}`}>
    <svg viewBox="0 0 400 220" className="h-full w-full" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
      <circle cx="325" cy="45" r="24" fill="#e4c88b" opacity=".65" />
      <path d="M0 188H400V220H0Z" fill="#ccdad1"/><path d="M50 185V62L126 37V185Z" fill="#b9ccc2"/><path d="M136 185V87L219 66V185Z" fill="#7faaa0"/><path d="M229 185V43L326 72V185Z" fill="#40786e"/>
      {[75,100,153,183,248,278,308].map((x,i) => <g key={x} fill="#f5f6e9" opacity=".8">{[96,122,148].map(y=><rect key={y} x={x} y={y+(i<2?-10:0)} width="10" height="13" rx="1"/>)}</g>)}
      <path d="M0 190H400" stroke="#678c7b" strokeWidth="3"/><path d="M33 190V159M357 190V159" stroke="#40786e" strokeWidth="6"/><circle cx="33" cy="149" r="20" fill="#91b7a5"/><circle cx="357" cy="149" r="20" fill="#91b7a5"/>
    </svg>
    <figcaption className="absolute bottom-3 left-3 right-3 rounded-lg bg-white/90 px-3 py-2 text-xs leading-relaxed text-stone-700">{lang === "zh" ? "中性示意图，非房源照片 · 获批照片暂时无法加载" : "Neutral illustration, not a property photo · approved photo temporarily unavailable"}</figcaption>
  </figure>;
}
