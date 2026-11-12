/** Manual local import after source domains are permitted. Does not alter application data or deploy. */
import{readFile,writeFile,mkdir,mkdtemp,rename}from'node:fs/promises';import{createHash}from'node:crypto';import sharp from'sharp';import{tmpdir}from'node:os';import path from'node:path';import manifest from'../src/lib/photos/manifest.json';import{downloadApprovedPhoto}from'../src/lib/photos/download';
async function main(){
 const records:Record<string,unknown>={};let failed=0;const staging=await mkdtemp(path.join(tmpdir(),'housingmatch-approved-photos-')); const staged:Record<string,string>={};
 for(const p of manifest){try{const image=await downloadApprovedPhoto(p.download);const src=`/images/approved/${p.id}.webp`;const result=await sharp(image.data,{limitInputPixels:64000000}).rotate().resize({width:1600,withoutEnlargement:true}).webp({quality:83}).toFile(path.join(staging,`${p.id}.webp`));if(result.width<400||result.height<300)throw Error('unusable_dimensions');const bytes=await readFile(path.join(staging,`${p.id}.webp`));staged[p.id]=path.join(staging,`${p.id}.webp`);records[p.id]={src,width:result.width,height:result.height,sha256:createHash('sha256').update(bytes).digest('hex'),downloadedAt:new Date().toISOString()};console.log(`${p.id}: downloaded, optimized; visual review still required`);}catch(error){failed++;const code=error instanceof Error&&/^photo_[a-z0-9_]+$/.test(error.message)?error.message:'network_or_decoding_unavailable';console.error(`${p.id}: ${code}; no asset verification claimed; remaining downloads not attempted`);break;}}
 // Atomic catalog update: do not publish a partially downloaded replacement pool.
 if(failed){console.error(`${failed} unavailable; catalog unchanged`);process.exitCode=1;return;}
 await mkdir('public/images/approved',{recursive:true});for(const p of manifest)await rename(staged[p.id],`public/images/approved/${p.id}.webp`);
 await writeFile('src/lib/photos/local-assets.json',JSON.stringify(records,null,2)+'\n');
}
main().catch(()=>{console.error('Approved-photo import failed; no deployment performed');process.exitCode=1;});
