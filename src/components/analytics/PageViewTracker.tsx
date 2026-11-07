"use client";
import { useEffect, useRef } from "react";
import type { Lang } from "@/lib/i18n";
import { track } from "@/lib/analytics/client";

/**
 * Sends one page_view when the page mounts. A ref guard keeps React StrictMode's dev
 * double-effect from sending twice, and a language change (router.refresh) re-renders this
 * component without remounting it, so switching EN/中文 is not a new page view.
 */
export function PageViewTracker({ lang }: { lang: Lang }) {
  const sent = useRef(false);
  const langRef = useRef(lang);
  langRef.current = lang;
  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    track("page_view", {}, langRef.current);
  }, []);
  return null;
}
