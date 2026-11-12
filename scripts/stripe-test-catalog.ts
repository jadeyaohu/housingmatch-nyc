/** Run manually in an approved nonproduction shell. No env files, key logging or automatic activation. */
import Stripe from 'stripe';import{ensureTestCatalog}from'./lib/stripe-test-catalog';
async function main(){
 const args=process.argv.slice(2);if(args.some(a=>a!=='--apply-test-catalog'))throw Error('unsupported_argument');
 const key=process.env.SUBSCRIPTIONS_STRIPE_SECRET_KEY??'';
 if(process.env.VERCEL_ENV==='production'||process.env.NEXT_PUBLIC_VERCEL_ENV==='production'||!/^sk_test_\w+$/.test(key))throw Error('approved_test_key_required_live_forbidden');
 const result=await ensureTestCatalog(new Stripe(key,{timeout:10000,maxNetworkRetries:1}),process.env.SUBSCRIPTIONS_STRIPE_TEST_ACCOUNT_ID??'',args.includes('--apply-test-catalog'));
 console.log(JSON.stringify(result,null,2));
}
main().catch((error)=>{const codes=['approved_test_key_required_live_forbidden','expected_test_account_required','wrong_stripe_account','stripe_test_mode_not_confirmed','duplicate_catalog_products','duplicate_catalog_prices','invalid_catalog_product','invalid_catalog_price','unmanaged_catalog_candidate_review_required','live_product_rejected','live_price_rejected','unsupported_argument'];console.error(codes.includes(error?.message)?error.message:'stripe_test_setup_unavailable');console.error('TEST catalog setup stopped. Verify secure TEST credentials, expected account, network access and catalog metadata. No secrets printed.');process.exitCode=1;});
