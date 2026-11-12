import manifest from'./manifest.json';import assignments from'./assignments.json';
export type PhotoStatus='verified_property'|'representative'|'pending_permission';
export type HousingPhoto=Omit<typeof manifest[number],'photo_status'|'propertyId'>&{photo_status:PhotoStatus;propertyId:string|null};
export function approvedPhotos(listingId:string,photos:HousingPhoto[]=manifest as HousingPhoto[]){return photos.filter(p=>p.photo_status==='representative'||(p.photo_status==='verified_property'&&p.propertyId===listingId));}
/** Covers are explicitly curated for primary listings, with no repeats in this catalog. Never imply property identity. */
export function listingPhotos(listingId='directory'){
 const photos=approvedPhotos(listingId);if(!photos.length)return[];
 const curated=(assignments as Record<string,string>)[listingId];const fallback=Array.from(listingId).reduce((n,c)=>(n*31+c.charCodeAt(0))>>>0,0)%photos.length;
 const cover=photos.find(p=>p.id===curated)??photos[fallback];
 return [cover,...photos.filter(p=>p.id!==cover.id&&p.borough===cover.borough),...photos.filter(p=>p.borough!==cover.borough)].slice(0,4);
}
