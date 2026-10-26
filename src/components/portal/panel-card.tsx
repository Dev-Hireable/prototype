import type { ReactNode } from "react";
import { Card } from "@/components/portal/ui";

/**
 * The one shell every tracker sidebar card uses. They were each written by hand and drifted —
 * 16px padding against 18px, `outline-border` against a literal `#e3e3e3`, an 18px display heading
 * against a 14px Inter one, and four different gaps — so a column of them read as four unrelated
 * boxes. A Card with its heading on the tray and a 16px column on the panel. Pass `aside` for a badge
 * or control that sits on the heading row, and `sub` for a line under the heading that the aside
 * sits beside.
 */
export function PanelCard({ title, sub, aside, children, className = "" }: { title: ReactNode; sub?: ReactNode; aside?: ReactNode; children?: ReactNode; className?: string }) {
  return (
    <Card title={title} sub={sub} aside={aside} className={`flex flex-col gap-4 p-4 ${className}`}>
      {children}
    </Card>
  );
}
