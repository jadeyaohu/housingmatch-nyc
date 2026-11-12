import {test,expect} from "@playwright/test";
for(const lang of ["en","zh"] as const){
  test(`${lang}: existing external consultation form, no intake or charges`,async({page,context},info)=>{
    await context.addCookies([{name:"lang",value:lang,url:"http://127.0.0.1:3210"}]);
    const requests:string[]=[];page.on("request",r=>requests.push(r.url()));
    await page.goto("/consultation?email=synthetic-sensitive");
    await expect(page.getByRole("heading",{level:1})).toHaveText(lang==="en"?"Chinese-language consultation":"中文住房教育咨询");
    await expect(page.getByText("$59",{exact:false})).toBeVisible();await expect(page.getByText("$99",{exact:false})).toBeVisible();
    await expect(page.locator("form")).toHaveCount(0);
    if(lang==="zh"){
      const link=page.getByRole("link",{name:/Google.*外部网站/});await expect(link).toHaveAttribute("href",/docs.google.com\/forms\/d\/e\/1FAIpQL/);await expect(link).toHaveAttribute("referrerpolicy","no-referrer");await expect(link).toHaveAttribute("rel","noopener noreferrer");
    }else await expect(page.locator('a[href*="docs.google.com/forms"]')).toHaveCount(0);
    expect(requests.some(u=>/api\/consultation|checkout.stripe|script.google/.test(u))).toBe(false);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await page.screenshot({path:info.outputPath(`consultation-v3-${lang}-${info.project.name}.png`),fullPage:true});
    await page.goto("/consultation/book");await expect(page).toHaveURL(/\/consultation$/);
  });
}
