// Shared, dependency-free constants for the analytics contract (safe to import in the browser).
export const MAX_BODY_BYTES = 8 * 1024; // whole request
export const MAX_EVENTS_PER_REQUEST = 20;
export const SOURCES = ["direct", "xiaohongshu", "instagram", "wechat", "linkedin", "google", "other"] as const;
export const COUNT_BUCKETS = ["0", "1-5", "6-20", "20+"] as const;
