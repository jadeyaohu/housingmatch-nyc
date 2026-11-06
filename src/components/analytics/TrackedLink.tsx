"use client";
import type { Lang } from "@/lib/i18n";
import { track } from "@/lib/analytics/client";

/**
 * External application link that records application_link_clicked on a real click
 * (left or middle button). Rendering or hovering sends nothing; navigation is never blocked.
 */
export function TrackedLink({
  href,
  listingId,
  from,
  lang,
  className,
  children,
}: {
  href: string;
  listingId: string;
  from: "results" | "listings";
  lang: Lang;
  className?: string;
  children: React.ReactNode;
}) {
  const fire = () => track("application_link_clicked", { listing_id: listingId, from }, lang);
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      onClick={fire}
      onAuxClick={(e) => {
        if (e.button === 1) fire();
      }}
    >
      {children}
    </a>
  );
}
