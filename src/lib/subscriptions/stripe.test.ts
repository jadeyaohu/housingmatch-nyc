import {afterEach,beforeEach,describe,it,expect,vi} from "vitest";
import type Stripe from "stripe";
vi.mock("server-only",()=>({}));
const m=vi.hoisted(()=>({command:vi.fn(),create:vi.fn(),sessionGet:vi.fn(),list:vi.fn(),customer:vi.fn(),retrieve:vi.fn(),update:vi.fn(),payments:vi.fn(),charge:vi.fn(),intent:vi.fn()}));
vi.mock("./db",()=>({betaCommand:m.command}));
vi.mock("./config",()=>({subscriptionConfig:()=>({origin:"http://localhost:3000"}),subscriptionStripe:()=>({customers:{create:m.customer},checkout:{sessions:{create:m.create,retrieve:m.sessionGet,list:m.list}},subscriptions:{retrieve:m.retrieve,update:m.update},invoicePayments:{list:m.payments},charges:{retrieve:m.charge},paymentIntents:{retrieve:m.intent}})}));
import {currentInvoiceUnrefunded,createSubscriptionCheckout,subscriptionEntitlement,syncSubscriptionEvent,cancelSubscription} from "./stripe";
const sub=()=>({id:"sub_fixture",customer:"cus_fixture",livemode:false,status:"active",cancel_at_period_end:false,latest_invoice:{id:"in_fixture",status:"paid",amount_paid:499},items:{data:[{quantity:1,current_period_end:Math.floor(Date.now()/1000)+86400,price:{unit_amount:499,currency:"usd",recurring:{interval:"month",interval_count:1}}}]}}) as unknown as Stripe.Subscription;
const event=(type="customer.subscription.updated")=>({id:"evt_fixture",type,livemode:false,data:{object:sub()}}) as Stripe.Event;
beforeEach(()=>{
  vi.resetAllMocks();m.command.mockImplementation((action)=>Promise.resolve(action==="checkout_info"?{}:action==="checkout_begin"?{attempt:"attempt",customer:null}:action==="customer_user"?{user_id:"user"}:action==="webhook_begin"?{token:"lease"}:{}));
  m.payments.mockResolvedValue({data:[{invoice:'in_fixture',status:'paid',payment:{type:'payment_intent',payment_intent:'pi_fixture'}}],has_more:false});
  m.charge.mockResolvedValue({id:'ch_fixture',customer:'cus_fixture',livemode:false,currency:'usd',paid:true,captured:true,refunded:false,amount_refunded:0});
  m.intent.mockImplementation(async()=>({livemode:false,status:'succeeded',latest_charge:await m.charge()}));
  m.customer.mockResolvedValue({id:"cus_fixture"});m.create.mockResolvedValue({id:"cs_fixture",url:"https://checkout.stripe.com/fixture",livemode:false});m.retrieve.mockResolvedValue(sub());m.list.mockResolvedValue({data:[{id:"cs_fixture",livemode:false}]});
});
afterEach(()=>vi.unstubAllEnvs());
describe("TEST subscriptions, mocked SDK transport",()=>{
  it.each([["basic",499],["smart",999]] as const)("uses fixed %s recurring amounts",async(plan,cents)=>{
    expect(await createSubscriptionCheckout("user",plan)).toBe("https://checkout.stripe.com/fixture");
    expect(m.create.mock.calls[0][0]).toMatchObject({mode:"subscription",customer:"cus_fixture",line_items:[{quantity:1,price_data:{currency:"usd",unit_amount:cents,recurring:{interval:"month"}}}]});
    expect(m.create.mock.calls[0][1]).toEqual({idempotencyKey:"beta-checkout-attempt"});
    expect(m.command.mock.calls.map(c=>c[0])).toEqual(["checkout_info","checkout_begin","customer_attach","checkout_attach"]);
  });
  it("does not create a second checkout after an ambiguous creation",async()=>{
    m.command.mockResolvedValue({attempt:"ambiguous",session:null});await expect(createSubscriptionCheckout("user","smart")).rejects.toThrow("busy");expect(m.create).not.toHaveBeenCalled();
  });
  it("does not create a second subscription if an old Checkout completed with an active subscription",async()=>{
    m.command.mockResolvedValue({attempt:"previous",session:"cs_previous"});m.sessionGet.mockResolvedValue({status:"complete",livemode:false,subscription:"sub_fixture"});
    await expect(createSubscriptionCheckout("user","basic")).rejects.toThrow("busy");expect(m.create).not.toHaveBeenCalled();
  });
  it("denies foreign redirect destinations or live sessions",async()=>{
    m.create.mockResolvedValue({livemode:true,url:"https://checkout.stripe.com/x"});await expect(createSubscriptionCheckout("user","basic")).rejects.toThrow();
    m.create.mockResolvedValue({livemode:false,url:"https://evil.test"});await expect(createSubscriptionCheckout("user","basic")).rejects.toThrow();
  });
  it("grants only active paid monthly USD quantity-one subscriptions at the fixed prices",()=>{
    expect(subscriptionEntitlement(sub()).plan).toBe("basic");
    const s=sub();s.items.data[0].price.unit_amount=999;(s.latest_invoice as Stripe.Invoice).amount_paid=999;expect(subscriptionEntitlement(s).plan).toBe("smart");
    for(const status of ["past_due","unpaid","canceled","incomplete","trialing"] as Stripe.Subscription.Status[]){const x=sub();x.status=status;expect(subscriptionEntitlement(x).plan).toBe("free");}
    const bad=sub();bad.livemode=true;expect(subscriptionEntitlement(bad).plan).toBe("free");
    const unpaid=sub();unpaid.latest_invoice=null;expect(subscriptionEntitlement(unpaid).plan).toBe("free");
    const quantity=sub();quantity.items.data[0].quantity=2;expect(subscriptionEntitlement(quantity).plan).toBe("free");
    const currency=sub();currency.items.data[0].price.currency="eur";expect(subscriptionEntitlement(currency).plan).toBe("free");
  });
  it("claims a database lease before reading provider current state, never trusts event status",async()=>{
    const e=event();(e.data.object as Stripe.Subscription).status="canceled";
    await syncSubscriptionEvent(e);
    expect(m.command.mock.calls.map(c=>c[0])).toEqual(["customer_user","webhook_begin","webhook_finish"]);
    expect(m.command.mock.calls[2][2]).toMatchObject({plan:"basic",subscription:"sub_fixture",session:"cs_fixture",token:"lease"});
    expect(m.command.mock.invocationCallOrder[1]).toBeLessThan(m.retrieve.mock.invocationCallOrder[0]);
  });
  it("skips duplicates without another provider call",async()=>{
    m.command.mockImplementation(op=>Promise.resolve(op==="customer_user"?{user_id:"user"}:{duplicate:true}));await syncSubscriptionEvent(event());expect(m.retrieve).not.toHaveBeenCalled();
  });
  it("releases the lease on provider errors so Stripe can retry",async()=>{
    m.retrieve.mockRejectedValue(new Error("network"));await expect(syncSubscriptionEvent(event())).rejects.toThrow();expect(m.command.mock.calls.at(-1)?.[0]).toBe("webhook_abort");
  });
  it("rejects live events and foreign customer snapshots",async()=>{
    await expect(syncSubscriptionEvent({...event(),livemode:true})).rejects.toThrow("forbidden");const x=sub();x.customer="cus_other";m.retrieve.mockResolvedValue(x);await expect(syncSubscriptionEvent(event())).rejects.toThrow("forbidden");
  });
  it("requests end-of-period cancellation without mutating entitlements optimistically",async()=>{
    m.command.mockResolvedValue({subscription:"sub_fixture",customer:"cus_fixture"});await cancelSubscription("user");expect(m.update).toHaveBeenCalledWith("sub_fixture",{cancel_at_period_end:true},{idempotencyKey:"beta-cancel-sub_fixture"});expect(m.command).toHaveBeenCalledTimes(1);
  });
});
it('uses a verified configured catalog Price and refuses an invalid one before reserving checkout',async()=>{
 vi.stubEnv('SUBSCRIPTIONS_STRIPE_BASIC_PRICE_ID','price_configured');
 const metadata={housingmatch_catalog:'housingmatch-pricing-v3-test',housingmatch_plan:'basic'};
 const price={active:true,livemode:false,type:'recurring',currency:'usd',unit_amount:499,recurring:{interval:'month',interval_count:1},metadata,product:{active:true,livemode:false,metadata}};
 const get=vi.fn().mockResolvedValue(price);
 const config=await import('./config');vi.spyOn(config,'subscriptionStripe').mockReturnValue({customers:{create:m.customer},checkout:{sessions:{create:m.create,retrieve:m.sessionGet,list:m.list}},subscriptions:{retrieve:m.retrieve,update:m.update},prices:{retrieve:get}}as never);
 await createSubscriptionCheckout('user','basic');expect(m.create.mock.calls[0][0].line_items).toEqual([{price:'price_configured',quantity:1}]);
 m.command.mockClear();get.mockResolvedValue({...price,unit_amount:1});await expect(createSubscriptionCheckout('user','basic')).rejects.toThrow('unavailable');expect(m.command).not.toHaveBeenCalled();vi.restoreAllMocks();
});

it('revokes refunded TEST periods and prevents a delayed paid event from re-granting them',async()=>{
 const original=m.command.getMockImplementation()!;m.command.mockImplementation((action,...args)=>action==='cancel_info'?Promise.resolve({subscription:'sub_fixture',customer:'cus_fixture'}):original(action,...args));
 m.charge.mockResolvedValue({id:'ch_fixture',customer:'cus_fixture',livemode:false,currency:'usd',paid:true,captured:true,refunded:true,amount_refunded:499});
 await syncSubscriptionEvent({id:'evt_refund',type:'charge.refunded',livemode:false,data:{object:{customer:'cus_fixture'}}}as Stripe.Event);
 expect(m.command.mock.calls.find(c=>c[0]==='webhook_finish')?.[2]).toMatchObject({plan:'free',valid_until:null});
 m.command.mockClear();await syncSubscriptionEvent({id:'evt_delayed_invoice',type:'invoice.paid',livemode:false,data:{object:{customer:'cus_fixture',parent:{subscription_details:{subscription:'sub_fixture'}}}}}as Stripe.Event);expect(m.command.mock.calls.find(c=>c[0]==='webhook_finish')?.[2]).toMatchObject({plan:'free'});
});
it('fails closed for partial refunds, unsupported invoice payments and provider-read errors',async()=>{
 m.charge.mockResolvedValue({customer:'cus_fixture',livemode:false,currency:'usd',paid:true,captured:true,refunded:false,amount_refunded:1});
 const {subscriptionStripe}=await import('./config');expect(await currentInvoiceUnrefunded(subscriptionStripe(),sub())).toBe(false);
 m.payments.mockResolvedValue({data:[],has_more:false});expect(await currentInvoiceUnrefunded(subscriptionStripe(),sub())).toBe(false);
 m.payments.mockRejectedValue(new Error('network'));await expect(syncSubscriptionEvent(event())).rejects.toThrow('network');expect(m.command.mock.calls.at(-1)?.[0]).toBe('webhook_abort');
});

it('restores paid access only from an authoritative unrefunded renewal, not the old refunded invoice',async()=>{
 const renewed=sub();(renewed.latest_invoice as Stripe.Invoice).id='in_renewal';m.retrieve.mockResolvedValue(renewed);
 m.payments.mockResolvedValue({data:[{invoice:'in_renewal',status:'paid',payment:{type:'payment_intent',payment_intent:'pi_new'}}],has_more:false});
 await syncSubscriptionEvent(event());expect(m.command.mock.calls.find(c=>c[0]==='webhook_finish')?.[2]).toMatchObject({plan:'basic'});
});
