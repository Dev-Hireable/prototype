import type { ReactNode } from "react";
import { Card } from "@/components/portal/ui";

/**
 * Tracker card with a heading and optional control on the tray. The white panel's
 * content aligns with the heading, and className controls placement of the tray.
 */
export function PanelCard({ title, sub, aside, children, className = "" }: { title: ReactNode; sub?: ReactNode; aside?: ReactNode; children?: ReactNode; className?: string }) {
  return (
    <Card title={title} sub={sub} aside={aside} trayClassName={className} panelClassName="flex flex-col gap-4 p-3">
      {children}
    </Card>
  );
}
