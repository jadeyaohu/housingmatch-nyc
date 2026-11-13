import {beforeEach,describe,it,expect,vi} from "vitest";
vi.mock("server-only",()=>({}));
const m=vi.hoisted(()=>({save:vi.fn(),dispatch:vi.fn(),config:vi.fn()}));
vi.mock("@/lib/consultation/config",()=>({consultationConfig:m.config}));vi.mock("@/lib/consultation/storage",()=>({saveBooking:m.save}));vi.mock("@/lib/consultation/email",()=>({dispatchConsultationEmails:m.dispatch}));
import{POST}from"./route";import{TERMS_VERSION,PRIVACY_VERSION}from"@/lib/consultation/model";
const input={submissionKey:"f053e2b1-65c1-46db-b0c9-aa49ae28d6c1",package:"standard",name:"Synthetic",email:"synthetic@example.test",language:"en",preferredLocal:new Date(Date.now()+10*86400000).toISOString().slice(0,16),timezone:"UTC",topic:"",termsAccepted:true,privacyAccepted:true,termsVersion:TERMS_VERSION,privacyVersion:PRIVACY_VERSION};
const req=(data:unknown=input,origin="http://localhost:3000")=>new Request("http://localhost:3000/api/consultation/bookings",{method:"POST",headers:{origin,"Content-Type":"application/json"},body:JSON.stringify(data)});
beforeEach(()=>{vi.resetAllMocks();m.config.mockReturnValue({origin:"http://localhost:3000"});m.save.mockResolvedValue({id:"be700000-0000-4000-8000-000000000001",status:"awaiting_payment",paymentStatus:"pending"});m.dispatch.mockResolvedValue({sent:1});});
describe("native booking request route",()=>{
 it("commits the request then attempts an acknowledgment and returns no contact data",async()=>{const r=await POST(req());expect(r.status).toBe(201);expect(await r.json()).toEqual({id:"be700000-0000-4000-8000-000000000001",status:"awaiting_payment",paymentStatus:"pending",acknowledgment:"sent"});expect(m.save.mock.invocationCallOrder[0]).toBeLessThan(m.dispatch.mock.invocationCallOrder[0]);});
 it("keeps a saved request successful when email configuration/delivery fails",async()=>{m.dispatch.mockRejectedValue(new Error("secret"));const r=await POST(req());expect(r.status).toBe(201);expect((await r.json()).acknowledgment).toBe("queued");});
 it("denies cross-origin writes before storage",async()=>{expect((await POST(req(input,"https://evil.test"))).status).toBe(403);expect(m.save).not.toHaveBeenCalled();});
 it.each([{termsAccepted:false},{privacyAccepted:false},{status:"paid"},{priceCents:1},{actor:"admin"},{topic:"123-45-6789"}])("rejects tampering and missing consent %j",async extra=>{expect((await POST(req({...input,...extra}))).status).toBe(400);expect(m.save).not.toHaveBeenCalled();});
 it("rejects oversized actual bodies and fails closed without configuration",async()=>{expect((await POST(req({topic:"x".repeat(9000)}))).status).toBe(400);m.config.mockImplementation(()=>{throw new Error("unavailable");});expect((await POST(req())).status).toBe(503);expect(m.save).not.toHaveBeenCalled();});
});
