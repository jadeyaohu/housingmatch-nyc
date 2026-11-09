"use client";
import { createBrowserClient } from "@supabase/ssr";
import type { AuthConfig } from "./config";

let client: ReturnType<typeof createBrowserClient> | null = null;
export function browserClient(cfg: AuthConfig) {
  client ??= createBrowserClient(cfg.url, cfg.key);
  return client;
}
