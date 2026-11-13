import archived from "@/lib/photos/manifest.json";
import { propertyPhotos } from "@/lib/photos/property";
import { getLang } from "@/lib/lang";
export default async function Page() {
  const zh = await getLang() === "zh", actual = propertyPhotos();
  return <section><h1 className="text-3xl font-bold">{zh ? "照片来源与授权" : "Photograph credits & permissions"}</h1>
    <p className="mt-4">{zh ? "楼盘照片必须与名称、地址及 Lottery ID 一致，并保留经创始人确认的使用许可及来源。图片可能为适应显示尺寸而裁切或优化。" : "Property photos must match the name, address and Lottery ID, with source attribution and founder-confirmed permission retained. Images may be cropped or optimized for display."}</p>
    {!actual.length && <p className="mt-5 rounded-xl bg-amber-50 p-4">{zh ? "目前尚无完成核实的实际楼盘图片。实际楼盘卡片不会使用无关照片代替。" : "No actual property assets have completed verification yet. Unrelated images are not substituted on property cards."}</p>}
    <div className="mt-6 space-y-4">{actual.map(p => <article id={p.id} key={p.id} className="scroll-mt-24 rounded-xl border bg-white p-5"><h2 className="font-semibold">{p.propertyName}</h2><p>{p.address} · Lottery ID {p.lotteryId}</p><p>{p.credit}</p><p>{p.permissionReference}</p><p>{zh ? "身份核对日期" : "Identity reviewed"}: {p.identityReviewedAt}</p><a href={p.source} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block underline">{zh ? "楼盘图片来源" : "Property photo source"}</a></article>)}</div>
    <h2 className="mt-9 text-xl font-bold">{zh ? "历史示意照片记录" : "Archived representative-image records"}</h2><p className="mt-3">{zh ? "以下记录保留旧版示意图片的署名和许可，不用于实际楼盘卡片。" : "These records retain attribution and permissions for the earlier representative pool, which is no longer used on actual property cards."}</p>
    <div className="mt-6 space-y-4">{archived.map(p => <article id={p.id} key={p.id} className="scroll-mt-24 rounded-xl border bg-white p-5"><h3 className="font-semibold">{p.title}</h3><p>{p.author} · {p.license}</p><p>{zh ? "Muse 核对日期" : "Muse review date"}: {p.verifiedAt}</p><div className="mt-3 flex flex-wrap gap-5 text-teal-800 underline"><a href={p.source} target="_blank" rel="noopener noreferrer">{zh ? "原始来源" : "Original source"}</a><a href={p.licenseSource} target="_blank" rel="noopener noreferrer">{zh ? "许可条款" : "License"}</a><a href={p.rightsSource} target="_blank" rel="noopener noreferrer">{zh ? "历史授权简报" : "Historical permission brief"}</a></div></article>)}</div>
  </section>;
}
