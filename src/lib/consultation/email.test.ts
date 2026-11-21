import {afterEach,beforeEach,describe,expect,it,vi} from "vitest";
vi.mock("server-only",()=>({}));
const command=vi.hoisted(()=>vi.fn());vi.mock("./storage",()=>({consultationCommand:command}));vi.mock("./config",()=>({consultationConfig:()=>({recipients:["synthetic@example.test"]}),schedulingLink:()=>"https://schedule.example.test/synthetic"}));
import {renderConsultationEmail,dispatchConsultationEmails,emailTransport,type EmailJob} from "./email";
const job:EmailJob={id:"outbox-1",token:"lease",kind:"acknowledgment",bookingId:"request-1",email:"synthetic@example.test",package:"standard",priceCents:5900,language:"en",message:null};
beforeEach(()=>vi.resetAllMocks());afterEach(()=>vi.unstubAllEnvs());
describe("native consultation mail",()=>{
 it.each(["en","zh"] as const)("renders %s package, services, price, Request ID, and no scheduling link before verification",language=>{
  const msg=renderConsultationEmail({...job,language});expect(msg.text).toContain("$59 / 30");expect(msg.text).toContain("request-1");expect(msg.text).toContain(language==="en"?"Preliminary household income":"家庭收入和 AMI");expect(msg.text).toContain(language==="en"?"Do not pay":"请勿付款");expect(msg.text).not.toContain("schedule.example.test");
 });
 it("includes payment instructions only after approval and configuration",()=>{vi.stubEnv("CONSULTATION_PAYMENT_INSTRUCTIONS_EN","SYNTHETIC payment placeholder");expect(renderConsultationEmail(job).text).not.toContain("SYNTHETIC payment placeholder");vi.stubEnv("CONSULTATION_PAYMENT_INSTRUCTIONS_APPROVED","true");expect(renderConsultationEmail(job).text).toContain("SYNTHETIC payment placeholder");});
 it("uses the selected language for scheduling, with no confirmed reservation claim",()=>{const text=renderConsultationEmail({...job,kind:"scheduling",language:"zh"}).text;expect(text).toContain("人工核实");expect(text).toContain("https://schedule.example.test/synthetic");expect(text).toContain("不是已确认");});
 it("does not claim or send when email is disabled",async()=>{expect(await dispatchConsultationEmails("request-1",null)).toEqual({sent:0,queued:true});expect(command).not.toHaveBeenCalled();});
 it("prepares immutable message and uses the stable outbox idempotency key",async()=>{
  const msg=renderConsultationEmail(job),send=vi.fn().mockResolvedValue("provider-test-id");command.mockImplementation(action=>Promise.resolve(action==="claim_email"?(command.mock.calls.filter(c=>c[0]==="claim_email").length===1?job:null):action==="prepare_email"?msg:{}));
  expect((await dispatchConsultationEmails("request-1",{send})).sent).toBe(1);expect(send).toHaveBeenCalledWith(msg,"consultation-email-outbox-1");expect(command.mock.calls.map(c=>c[0])).toEqual(["claim_email","prepare_email","complete_email","claim_email"]);
 });
 it("releases failed delivery for retry without marking sent",async()=>{
  command.mockImplementation(op=>Promise.resolve(op==="claim_email"?job:renderConsultationEmail(job)));
  const send=vi.fn().mockRejectedValue(new Error("provider sensitive error"));expect((await dispatchConsultationEmails("request-1",{send})).queued).toBe(true);expect(command.mock.calls.at(-1)?.[0]).toBe("release_email");expect(command.mock.calls.some(c=>c[0]==="complete_email")).toBe(false);
 });
 it("never silently enables an email transport",()=>{expect(emailTransport()).toBeNull();vi.stubEnv("CONSULTATION_EMAIL_TEST_ENABLED","true");expect(emailTransport()).toBeNull();});
});
