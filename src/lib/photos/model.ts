import manifest from './manifest.json';
export type PhotoStatus='verified_property'|'representative'|'pending_permission';
export type HousingPhoto=Omit<typeof manifest[number],'photo_status'|'propertyId'>&{photo_status:PhotoStatus;propertyId:string|null};
export function approvedPhotos(listingId:string,photos:HousingPhoto[]=manifest as HousingPhoto[]){return photos.filter(p=>p.photo_status==='representative'||(p.photo_status==='verified_property'&&p.propertyId===listingId));}
/** Stable representative association, never an assertion that this is the listing's building. */
export function listingPhotos(listingId='directory'){
 const photos=approvedPhotos(listingId);if(!photos.length)return[];
 const index=Array.from(listingId).reduce((n,c)=>(n*31+c.charCodeAt(0))>>>0,0)%photos.length;
 return [...photos.slice(index),...photos.slice(0,index)];
}
