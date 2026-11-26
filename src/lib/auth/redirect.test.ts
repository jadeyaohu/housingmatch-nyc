import { expect,it } from "vitest";
import { authReturnPath } from "./redirect";
it("never redirects authentication to another origin",()=>{
  for(const value of ["//evil.test","/\\evil.test","https://evil.test","\n//evil.test",null])expect(authReturnPath(value)).toBe("/quiz");
  expect(authReturnPath("/account?tab=saved")).toBe("/account?tab=saved");
});
