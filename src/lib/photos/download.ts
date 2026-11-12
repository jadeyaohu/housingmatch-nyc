/** Fixed approved sources only. Never accept a client URL or forward browser credentials. */
export async function downloadApprovedPhoto(download:string,fetcher:typeof fetch=fetch){
 let url=new URL(download);const signal=AbortSignal.timeout(15000);
 const valid=(u:URL)=>u.protocol==='https:'&&!u.username&&!u.password&&!u.hash&&['images.pexels.com','unsplash.com','images.unsplash.com'].includes(u.hostname)&&(!u.port||u.port==='443');
 if(!valid(url))throw Error('invalid_photo_origin');
 for(let redirects=0;redirects<4;redirects++){
  const response=await fetcher(url,{method:'GET',redirect:'manual',credentials:'omit',referrerPolicy:'no-referrer',signal,cache:'no-store',headers:{Accept:'image/jpeg,image/png,image/webp'}});
  if([301,302,303,307,308].includes(response.status)){const next=new URL(response.headers.get('location')??'',url);await response.body?.cancel();if(!valid(next)||next.hostname==='unsplash.com')throw Error('invalid_photo_redirect');url=next;continue;}
  const type=response.headers.get('content-type')?.split(';')[0].trim().toLowerCase();if(!response.ok||!['image/jpeg','image/png','image/webp'].includes(type??'')){await response.body?.cancel();throw Error('photo_unavailable');}
  const reader=response.body?.getReader();if(!reader)throw Error('photo_unavailable');const chunks:Uint8Array[]=[];let size=0;
  try{while(true){const part=await reader.read();if(part.done)break;size+=part.value.length;if(size>6*1024*1024){await reader.cancel();throw Error('photo_too_large');}chunks.push(part.value);}}finally{reader.releaseLock();}
  if(!size)throw Error('empty_photo');const data=new Uint8Array(size);let offset=0;for(const c of chunks){data.set(c,offset);offset+=c.length;}
  return{data,type:type!};
 }
 throw Error('photo_redirect_limit');
}
