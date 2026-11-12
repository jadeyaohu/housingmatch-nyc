import "server-only";
// Synthetic journeys are local developer/test fixtures, never a hosted fallback.
export function previewDemoEnabled() {
  if (process.env.VERCEL_ENV || process.env.NEXT_PUBLIC_VERCEL_ENV) return false;
  return process.env.BETA_PREVIEW_DEMO === "true" &&
    (process.env.NODE_ENV === "development" || process.env.BETA_FIXTURES === "synthetic");
}
