import{z}from'zod';
export const PREVIEW_STORAGE_KEY='hm-preview-synthetic-v1';
const id=z.string().regex(/^[a-zA-Z0-9_-]{1,100}$/),day=z.string().regex(/^\d{4}-\d{2}-\d{2}$/).or(z.literal(''));
export const previewSnapshot=z.object({version:z.literal(1),expires:z.number().finite(),signedIn:z.boolean(),profile:z.enum(['single','family','larger']),plan:z.enum(['free','basic','smart']),saved:z.array(id).max(50),day,used:z.number().int().min(0).max(15),alerts:z.boolean(),alertFrequency:z.enum(['daily','weekly']),requests:z.array(z.object({id:z.uuid(),package:z.enum(['standard','expert']),language:z.enum(['en','zh']),state:z.enum(['awaiting_payment','scheduling_invited'])}).strict()).max(20),applications:z.array(z.object({id:z.uuid(),listingId:id,stage:z.enum(['unknown','awaiting','submitted','lottery_closed','log_number_received','under_review','selected','not_selected']),date:day}).strict()).max(50)}).strict();
export type PersistentDemo=z.infer<typeof previewSnapshot>;
export function readPreviewSnapshot(raw:string|null,now=Date.now()):PersistentDemo|null{if(!raw||raw.length>32768)return null;try{const r=previewSnapshot.safeParse(JSON.parse(raw));return r.success&&r.data.expires>now&&r.data.expires<=now+8*86400000?r.data:null;}catch{return null;}}
/** Only allowlisted synthetic fields, never contact/topic/chat/profile inputs, analytics events or visit IDs. */
export function writePreviewSnapshot(state:Omit<PersistentDemo,'version'|'expires'>,now=Date.now()){return JSON.stringify(previewSnapshot.parse({version:1,expires:now+7*86400000,...state}));}
