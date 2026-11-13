import {test,expect} from "@playwright/test";
test("legacy Stripe consultation charge routes stay retired; native consultation stays available",async({request,page})=>{
 for(const path of ["checkout","invite","confirm","refund","webhook"]){const r=await request.post(`/api/consultation/payments/${path}`,{data:{synthetic:true}});expect(r.status()).toBe(410);}
 await page.goto("/consultation/pay/result?paid=true");await expect(page).toHaveURL(/\/consultation$/);await expect(page.locator('a[href^="/consultation/book"]')).toHaveCount(2);
});
