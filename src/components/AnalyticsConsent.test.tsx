// @vitest-environment jsdom
import{afterEach,beforeEach,describe,it,expect,vi}from"vitest";import{render,cleanup,screen,waitFor,fireEvent}from"@testing-library/react";
vi.mock("next/navigation",()=>({usePathname:()=>"/"}));
import{AnalyticsConsent}from"./AnalyticsConsent";import{CONSENT_KEY}from"@/lib/analytics/events";
const fetcher=vi.fn().mockResolvedValue({ok:true,json:async()=>({})});
beforeEach(()=>{localStorage.clear();vi.stubEnv("NEXT_PUBLIC_GTM_EVENTS_ENABLED","false");vi.stubGlobal("fetch",fetcher);fetcher.mockClear();});afterEach(()=>{cleanup();vi.unstubAllEnvs();vi.unstubAllGlobals();});
describe("disabled analytics and retained consent",()=>{
 it("makes no analytics endpoint calls even if an older build saved consent",async()=>{localStorage.setItem(CONSENT_KEY,"yes");render(<AnalyticsConsent lang="en"/>);await waitFor(()=>expect(screen.getByText(/Real product analytics is OFF/)).toBeTruthy());expect(fetcher).not.toHaveBeenCalled();});
 it("allows withdrawal while collection is disabled",()=>{localStorage.setItem(CONSENT_KEY,"yes");render(<AnalyticsConsent lang="en"/>);fireEvent.click(screen.getByRole("button",{name:"Decline / withdraw consent"}));expect(localStorage.getItem(CONSENT_KEY)).toBe("no");expect(fetcher).not.toHaveBeenCalled();});
});
