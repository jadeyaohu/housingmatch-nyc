import {afterEach,beforeEach,describe,it,expect,vi} from "vitest";
import type Stripe from "stripe";
vi.mock("server-only",()=>({}));
const m=vi.hoisted(()=>({command:vi.fn(),create:vi.fn(),sessionGet:vi.fn(),list:vi.fn(),customer:vi.fn(),retrieve:vi.fn(),update:vi.fn()}));
vi.mock("./db",()=>({betaCommand:m.command}));
vi.mock("./config",()=>({subscriptionConfig:()=>({origin:"http://localhost:3000"}),subscriptionStripe:()=>({customers:{create:m.customer},checkout:{sessions:{create:m.create,retrieve:m.sessionGet,list:m.list}},subscriptions:{retrieve:m.retrieve,update:m.update}})}));
import {createSubscriptionCheckout,subscriptionEntitlement,syncSubscriptionEvent,cancelSubscription} from "./stripe";
const sub=()=>({id:"sub_fixture",customer:"cus_fixture",livemode:false,status:"active",cancel_at_period_end:false,latest_invoice:{status:"paid",amount_paid:499},items:{data:[{quantity:1,current_period_end:Math.floor(Date.now()/1000)+86400,price:{unit_amount:499,currency:"usd",recurring:{interval:"month",interval_count:1}}}]}}) as unknown as Stripe.Subscription;
const event=(type="customer.subscription.updated")=>({id:"evt_fixture",type,livemode:false,data:{object:sub()}}) as Stripe.Event;
beforeEach(()=>{
  vi.resetAllMocks();m.command.mockImplementation((action)=>Promise.resolve(action==="checkout_info"?{}:action==="checkout_begin"?{attempt:"attempt",customer:null}:action==="customer_user"?{user_id:"user"}:action==="webhook_begin"?{token:"lease"}:{}));
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
