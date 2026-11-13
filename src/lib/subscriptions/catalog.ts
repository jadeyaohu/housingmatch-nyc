import type Stripe from 'stripe';import{PLANS}from'./model';
/** A configured catalog price must match this fixed product, not just happen to cost the same amount. */
export function validCatalogPrice(price:Stripe.Price,plan:'basic'|'smart'){
 const product=typeof price.product==='object'&&!('deleted'in price.product)?price.product:null;
 return !price.livemode&&price.active&&price.type==='recurring'&&price.currency==='usd'&&price.unit_amount===PLANS[plan].cents&&price.recurring?.interval==='month'&&price.recurring.interval_count===1&&
 price.metadata.housingmatch_catalog==='housingmatch-pricing-v3-test'&&price.metadata.housingmatch_plan===plan&&!!product&&!product.livemode&&product.active&&product.metadata.housingmatch_catalog==='housingmatch-pricing-v3-test'&&product.metadata.housingmatch_plan===plan;
}
