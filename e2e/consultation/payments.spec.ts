import {test,expect} from "@playwright/test";
test("retired consultation endpoints cannot be reactivated by old flags",async({request,page})=>{
  for(const path of ["bookings","payments/checkout","payments/invite","payments/confirm","payments/refund","payments/webhook"]){
    const r=await request.post(`/api/consultation/${path}`,{data:{synthetic:true}});expect(r.status()).toBe(410);expect(await r.json()).toEqual({error:"retired",next:"/consultation"});
  }
  await page.goto("/consultation/pay/result?paid=true");await expect(page).toHaveURL(/\/consultation$/);
});
