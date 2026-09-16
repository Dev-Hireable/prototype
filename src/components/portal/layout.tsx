import type { ReactNode } from "react";

/** Shared desktop content width used by both portal shells and dashboard frames. */
export const PORTAL_CONTENT_CLASS = "mx-auto w-full max-w-[1200px]";

export function PortalContent({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`${PORTAL_CONTENT_CLASS} flex flex-col gap-6 py-2 ${className}`}>{children}</div>;
}
