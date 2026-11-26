import sharp from'sharp';
import{readFile}from'node:fs/promises';import path from'node:path';import manifest from'@/lib/photos/manifest.json';import{downloadApprovedPhoto}from'@/lib/photos/download';
export const runtime='nodejs';
type ImageData={data:Uint8Array;type:string};
const cache=new Map<string,{expires:number;promise:Promise<ImageData>}>();
export async function GET(_req:Request,{params}:{params:Promise<{id:string}>}){
 const{id}=await params;const photo=manifest.find(p=>p.id===id);if(!photo)return new Response(null,{status:404});
 try{
  if(process.env.BETA_FIXTURES==='synthetic'){
   if(process.env.VERCEL_ENV==='production'||process.env.NEXT_PUBLIC_VERCEL_ENV==='production')throw Error('forbidden');
   return new Response(await readFile(path.join(process.cwd(),'public','images','testing','approved-photo-contract.png')),{headers:{'Content-Type':'image/png','Cache-Control':'no-store','X-Photo-Evidence':'synthetic-contract-fixture-not-approved-pixels'}});
  }
  let hit=cache.get(id);if(!hit||hit.expires<Date.now()){
   const entry={expires:Date.now()+86400000,promise:downloadApprovedPhoto(photo.download).then(async image=>{const instance=sharp(image.data,{limitInputPixels:64000000});const metadata=await instance.metadata();if(!metadata.width||!metadata.height||metadata.width<400||metadata.height<300)throw Error('unusable_photo');const data=await instance.rotate().resize({width:1600,withoutEnlargement:true}).webp({quality:83}).toBuffer();return{data,type:'image/webp'};})};cache.set(id,entry);hit=entry;
   entry.promise.catch(()=>{entry.expires=Date.now()+30000;});
  }
  const image=await hit.promise;
  return new Response(image.data as BodyInit,{headers:{'Content-Type':image.type,'Cache-Control':'public,max-age=86400','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'}});
 }catch{return new Response(null,{status:503,headers:{'Cache-Control':'no-store','Retry-After':'30'}});}
}
