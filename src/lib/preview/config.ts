import "server-only";
// Founder-authorized synthetic journeys, NEVER enabled in Production or used as a real-provider fallback.
export function previewDemoEnabled() {
  if(process.env.VERCEL_ENV==="production" || process.env.NEXT_PUBLIC_VERCEL_ENV==="production")return false;
  return process.env.VERCEL_ENV==="preview" || process.env.BETA_PREVIEW_DEMO==="true";
}
