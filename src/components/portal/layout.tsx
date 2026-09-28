import type { ReactNode } from "react";

/**
 * Shared desktop content width used by both portal shells and dashboard frames.
 * 1280: at 1512 wide the cap never binds, so this only changes what happens on a larger monitor.
 * 1440 left the dashboard feeling loose — cards stretched and body copy ran long — so it is capped
 * tighter, which still clears the widest fixed layout on the page (the 420px tracker sidebar beside
 * its main column).
 */
export const PORTAL_CONTENT_CLASS = "mx-auto w-full max-w-[1280px]";

export function PortalContent({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`${PORTAL_CONTENT_CLASS} flex flex-col gap-6 py-2 ${className}`}>{children}</div>;
}
