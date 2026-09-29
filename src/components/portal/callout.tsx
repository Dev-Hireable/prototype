import type { ReactNode } from "react";
import { InfoBanner } from "@/components/portal/ui";

/** A banner with its one action beside its message: "Juan sent 2 items for review · Review". */
export function Callout({ tone = "info", children, action }: { tone?: "info" | "warn"; children: ReactNode; action?: ReactNode }) {
  return (
    <InfoBanner tone={tone}>
      <span className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <span className="min-w-0 flex-1 leading-[1.4]">{children}</span>
        {action}
      </span>
    </InfoBanner>
  );
}
