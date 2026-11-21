// @vitest-environment jsdom
import {afterEach,beforeEach,describe,it,expect,vi} from "vitest";
import {eventSchema,trackEvent,CONSENT_KEY} from "./events";
const layer=()=> (window as Window & {dataLayer?: object[]}).dataLayer;
beforeEach(()=>{vi.stubEnv("NEXT_PUBLIC_GTM_EVENTS_ENABLED","true");localStorage.clear();delete (window as Window & {dataLayer?:object[]}).dataLayer;});
afterEach(()=>vi.unstubAllEnvs());
describe("privacy allowlisted GTM foundation",()=>{
  it("does nothing by default or after consent withdrawal",()=>{
    trackEvent({event:"chatbot_message",language:"en"});expect(layer()).toBeUndefined();
    localStorage.setItem(CONSENT_KEY,"yes");trackEvent({event:"chatbot_message",language:"en"});expect(layer()).toHaveLength(1);
    localStorage.setItem(CONSENT_KEY,"no");trackEvent({event:"chatbot_message",language:"en"});expect(layer()).toHaveLength(1);
  });
  it("uses one document visit ID and includes only permitted scalar properties",()=>{
    localStorage.setItem(CONSENT_KEY,"yes");history.replaceState(null,"","/?ssn=synthetic-sensitive");
    trackEvent({event:"landing_visit",language:"zh"});trackEvent({event:"subscription_page_view",language:"zh"});
    expect((layer()![0] as {visit_id:string}).visit_id).toBe((layer()![1] as {visit_id:string}).visit_id);
    expect(Object.keys(layer()![0]).sort()).toEqual(["channel","event","language","schema_version","visit_id"]);expect(JSON.stringify(layer())).not.toContain("sensitive");
  });
  it.each(["question","answer","email","url","income","user_id","listing_id"])("rejects extra %s",key=>expect(eventSchema.safeParse({event:"chatbot_message",language:"en",[key]:"sensitive"}).success).toBe(false));
  it("rejects raw acquisition strings",()=>expect(eventSchema.safeParse({event:"landing_visit",language:"en",channel:"private@example.test"}).success).toBe(false));
  it("does nothing when the build flag is disabled even with consent",()=>{vi.stubEnv("NEXT_PUBLIC_GTM_EVENTS_ENABLED","false");localStorage.setItem(CONSENT_KEY,"yes");trackEvent({event:"landing_visit",language:"en"});expect(layer()).toBeUndefined();});
});
