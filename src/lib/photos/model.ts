import manifest from'./manifest.json';import assignments from'./assignments.json';import assets from'./local-assets.json';
export type PhotoStatus='verified_property'|'representative'|'pending_permission';
export type HousingPhoto=Omit<typeof manifest[number],'photo_status'|'propertyId'>&{photo_status:PhotoStatus;propertyId:string|null};
type LocalAsset={src:string;width:number;height:number;sha256:string;downloadedAt:string};
export function approvedPhotos(listingId:string,photos:HousingPhoto[]=manifest as HousingPhoto[]){return photos.filter(p=>p.photo_status==='representative'||(p.photo_status==='verified_property'&&p.propertyId===listingId)).map(p=>{const local=(assets as Record<string,LocalAsset>)[p.id];return local?{...p,...local}:p;});}
export const HERO_PHOTO_ID='unsplash-clem';
/** Only the founder-approved pool; generic NYC does not mean borough-confirmed. */
export function listingPhotos(listingId='directory'){
 const photos=approvedPhotos(listingId);if(!photos.length)return[];
 const curated=(assignments as Record<string,string>)[listingId];const fallback=Array.from(listingId).reduce((n,c)=>(n*31+c.charCodeAt(0))>>>0,0)%photos.length;
 const cover=photos.find(p=>p.id===curated)??photos[fallback];
 const pool=cover.style==='brownstone'?photos.filter(p=>p.style==='brownstone'||p.style==='entrance'):photos.filter(p=>p.style==='highrise'||p.style==='entrance');
 return[cover,...pool.filter(p=>p.id!==cover.id)].slice(0,3);
}
