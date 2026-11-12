import{describe,it,expect}from'vitest';import{readFileSync}from'node:fs';import{createHash}from'node:crypto';import{approvedPhotos,listingPhotos,type HousingPhoto}from'./model';import manifest from'./manifest.json';
describe('photo rights and association',()=>{
 it('excludes pending media and wrongly associated verified property photos',()=>{const p=manifest[0];const rows=[{...p,photo_status:'pending_permission'},{...p,photo_status:'verified_property',propertyId:'another'},{...p,photo_status:'representative'}]as HousingPhoto[];expect(approvedPhotos('mine',rows)).toEqual([rows[2]]);});
 it('has per-file source/license evidence and matching optimized asset hashes',()=>{for(const p of manifest){expect(p.photo_status).toBe('representative');expect(p.propertyId).toBeNull();expect(p.rightsSource).toContain('joestein/ethos');expect(p.author.length).toBeGreaterThan(2);expect(p.license).not.toMatch(/NC|ND/);expect(createHash('sha256').update(readFileSync(`public${p.src}`)).digest('hex')).toBe(p.sha256);}});
 it('makes representative cover order deterministic without changing property associations',()=>{expect(listingPhotos('demo-exact')).toEqual(listingPhotos('demo-exact'));expect(new Set(listingPhotos('another').map(p=>p.id)).size).toBe(4);});
});

it("assigns distinct covers to the current primary catalog",async()=>{const assignments=(await import("./assignments.json")).default;expect(new Set(Object.values(assignments)).size).toBe(Object.keys(assignments).length);expect(Object.keys(assignments)).toHaveLength(32);});
