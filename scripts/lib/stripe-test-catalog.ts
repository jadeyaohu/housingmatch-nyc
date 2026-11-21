import type Stripe from 'stripe';
export const CATALOG='housingmatch-pricing-v3-test';
export const CATALOG_PLANS={basic:499,smart:999}as const;
export async function ensureTestCatalog(stripe:Stripe,expectedAccount:string,apply=false){
 if(!/^acct_[A-Za-z0-9]+$/.test(expectedAccount))throw Error('expected_test_account_required');
 const balance=await stripe.balance.retrieve();if(balance.livemode!==false)throw Error('stripe_test_mode_not_confirmed');
 const account=await stripe.accounts.retrieve(null);if(account.id!==expectedAccount)throw Error('wrong_stripe_account');
 const products:Stripe.Product[]=[];for await(const p of stripe.products.list({limit:100}))products.push(p);
 const result:Record<string,{product:string|null;price:string|null;action:string}>={};
 for(const[plan,cents]of Object.entries(CATALOG_PLANS)){
  const lookup=`${CATALOG}-${plan}-usd-monthly`;const matches=products.filter(p=>p.metadata.housingmatch_catalog===CATALOG&&p.metadata.housingmatch_plan===plan);
  if(!matches.length&&products.some(p=>p.active&&p.name?.toLowerCase().includes('housingmatch')&&p.name.toLowerCase().includes(plan)))throw Error('unmanaged_catalog_candidate_review_required');
  if(matches.length>1)throw Error('duplicate_catalog_products');let product=matches[0];
  if(product&&(!product.active||product.livemode))throw Error('invalid_catalog_product');
  const prices=await stripe.prices.list({lookup_keys:[lookup],limit:100});if(prices.has_more||prices.data.length>1)throw Error('duplicate_catalog_prices');let price=prices.data[0];
  if(price&&(!product||price.product!==product.id||price.livemode||!price.active||price.currency!=='usd'||price.unit_amount!==cents||price.type!=='recurring'||price.recurring?.interval!=='month'||price.recurring.interval_count!==1||price.metadata.housingmatch_catalog!==CATALOG||price.metadata.housingmatch_plan!==plan))throw Error('invalid_catalog_price');
  if(!apply){result[plan]={product:product?.id??null,price:price?.id??null,action:price?'reuse':'would_create_test_only'};continue;}
  product??=await stripe.products.create({name:`HousingMatch ${plan==='basic'?'Basic':'Smart'} — TEST`,metadata:{housingmatch_catalog:CATALOG,housingmatch_plan:plan}},{idempotencyKey:`${expectedAccount}-${CATALOG}-${plan}-product`});
  if(product.livemode)throw Error('live_product_rejected');
  price??=await stripe.prices.create({product:product.id,currency:'usd',unit_amount:cents,recurring:{interval:'month',interval_count:1},lookup_key:lookup,metadata:{housingmatch_catalog:CATALOG,housingmatch_plan:plan}},{idempotencyKey:`${expectedAccount}-${lookup}-price`});
  if(price.livemode)throw Error('live_price_rejected');result[plan]={product:product.id,price:price.id,action:'verified_test_catalog'};
 }
 return{account:account.id,mode:'TEST_ONLY',apply,plans:result};
}
