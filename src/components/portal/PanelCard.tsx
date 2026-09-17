import type { ReactNode } from "react";
import { Card } from "@/components/independent/ui";
import { CardHeading } from "@/components/team/ui";

/**
 * The one shell every tracker sidebar card uses. They were each written by hand and drifted —
 * 16px padding against 18px, `outline-border` against a literal `#e3e3e3`, an 18px display heading
 * against a 14px Inter one, and four different gaps — so a column of them read as four unrelated
 * boxes. Pass `aside` for a badge or pill that sits on the heading row.
 */
export function PanelCard({ title, aside, children, className = "" }: { title: ReactNode; aside?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <Card className={`flex flex-col gap-4 p-4 ${className}`}>
      <div className="flex items-start justify-between gap-3">
        <CardHeading>{title}</CardHeading>
        {aside}
      </div>
      {children}
    </Card>
  );
}
