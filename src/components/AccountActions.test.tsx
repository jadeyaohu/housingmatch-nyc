// @vitest-environment jsdom
import { afterEach,expect,it,vi } from "vitest";
import { cleanup,fireEvent,render,screen,waitFor } from "@testing-library/react";
const mocks=vi.hoisted(()=>({signOut:vi.fn(),replace:vi.fn(),refresh:vi.fn()}));
vi.mock("next/navigation",()=>({useRouter:()=>({replace:mocks.replace,refresh:mocks.refresh})}));
vi.mock("@/lib/supabase/browser",()=>({browserClient:()=>({auth:{signOut:mocks.signOut}})}));
import { AccountActions } from "./AccountActions";
afterEach(()=>{cleanup();localStorage.clear();vi.clearAllMocks();});
it("removes anonymous household answers on sign-out so another user cannot inherit them",async()=>{
 localStorage.setItem("hm-quiz-v1",JSON.stringify({income:"60000"}));mocks.signOut.mockResolvedValue({error:null});
 render(<AccountActions cfg={{url:"http://127.0.0.1:54321",key:"synthetic",project:"dev",google:false,email:true}} labels={{signOut:"Sign out",del:"Delete saved data",confirm:"Confirm",deleted:"Deleted"}}/>);
 fireEvent.click(screen.getByText("Sign out"));
 await waitFor(()=>expect(mocks.replace).toHaveBeenCalledWith("/"));expect(localStorage.getItem("hm-quiz-v1")).toBeNull();
});
