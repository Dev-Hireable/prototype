import type { ReactNode } from "react";
import { Card, CardHeading } from "@/components/portal/ui";

/**
 * The one shell every tracker sidebar card uses. They were each written by hand and drifted —
 * 16px padding against 18px, `outline-border` against a literal `#e3e3e3`, an 18px display heading
 * against a 14px Inter one, and four different gaps — so a column of them read as four unrelated
 * boxes. Pass `aside` for a badge or pill that sits on the heading row, and `sub` for a line under
 * the heading that the aside sits beside.
 */
export function PanelCard({ title, sub, aside, children, className = "" }: { title: ReactNode; sub?: ReactNode; aside?: ReactNode; children?: ReactNode; className?: string }) {
  return (
    <Card className={`flex flex-col gap-4 p-4 ${className}`}>
      <div className="flex items-start justify-between gap-3">
        {sub ? (
          <div className="flex min-w-0 flex-col gap-0.5">
            <CardHeading>{title}</CardHeading>
            <p className="text-[12.5px] leading-[1.4] text-ink-2">{sub}</p>
          </div>
        ) : (
          <CardHeading>{title}</CardHeading>
        )}
        {aside}
      </div>
      {children}
    </Card>
  );
}
