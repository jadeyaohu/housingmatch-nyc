import {afterEach,describe,expect,it,vi} from "vitest";
vi.mock("server-only",()=>({}));
const rpc=vi.hoisted(()=>vi.fn());vi.mock("@supabase/supabase-js",()=>({createClient:()=>({rpc})}));
import {bookingConfigured,saveBooking} from "./storage";
import {TERMS_VERSION,PRIVACY_VERSION,type BookingRequest} from "./model";
const input:BookingRequest={submissionKey:"f053e2b1-65c1-46db-b0c9-aa49ae28d6c1",package:"standard",name:"Synthetic Person",email:"synthetic@example.test",language:"en",preferredLocal:"2030-06-01T14:30",timezone:"America/New_York",topic:"",termsAccepted:true,privacyAccepted:true,termsVersion:TERMS_VERSION,privacyVersion:PRIVACY_VERSION};
function configured(){for(const[k,v]of Object.entries({CONSULTATION_BOOKING_ENABLED:"true",CONSULTATION_POLICIES_APPROVED:"true",CONSULTATION_NONPRODUCTION_APPROVED:"true",CONSULTATION_APP_ORIGIN:"http://localhost:3000",CONSULTATION_SUPABASE_URL:"http://localhost:54321",CONSULTATION_SUPABASE_SERVICE_ROLE_KEY:"synthetic",CONSULTATION_TEST_RECIPIENTS:"synthetic@example.test",VERCEL_ENV:"preview"}))vi.stubEnv(k,v);}
afterEach(()=>{vi.unstubAllEnvs();vi.clearAllMocks();});
describe("native consultation storage",()=>{
 it("fails closed without explicit approved nonproduction resources",()=>{expect(bookingConfigured()).toBe(false);configured();expect(bookingConfigured()).toBe(true);vi.stubEnv("VERCEL_ENV","production");expect(bookingConfigured()).toBe(false);});
 it("cannot use an insecure fallback or an unapproved recipient",async()=>{await expect(saveBooking(input,"2030-06-01T18:30:00Z")).rejects.toThrow();expect(rpc).not.toHaveBeenCalled();configured();await expect(saveBooking({...input,email:"not-approved@example.test"},"2030-06-01T18:30:00Z")).rejects.toThrow("invalid_input");expect(rpc).not.toHaveBeenCalled();});
 it("uses a stable submission token but returns a different server-generated Request ID",async()=>{
  configured();const id="be700000-0000-4000-8000-000000000001";rpc.mockResolvedValue({data:{id,status:"awaiting_payment",paymentStatus:"pending",acknowledgment:"queued"},error:null});
  expect(await saveBooking(input,"2030-06-01T18:30:00Z")).toEqual({id,status:"awaiting_payment",paymentStatus:"pending",acknowledgment:"queued"});await saveBooking(input,"2030-06-01T18:30:00Z");
  expect(rpc.mock.calls[0]).toEqual(rpc.mock.calls[1]);expect(rpc.mock.calls[0][1].p_id).toBe(input.submissionKey);expect(rpc.mock.calls[0][1].p_data).not.toHaveProperty("priceCents");
 });
});
