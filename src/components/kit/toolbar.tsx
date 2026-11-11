import type { ReactNode } from "react";
import { PHONE_FILTER_ROW } from "@/components/kit/styles";

/** Search + dropdowns on the left, a count or a button on the right; they wrap when they don't fit, and on a phone the search takes a row of its own. */
export function Toolbar({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className={`flex flex-wrap items-center gap-3 ${PHONE_FILTER_ROW}`}>
      {children}
      <span className="flex-1 max-md:hidden" />
      {right}
    </div>
  );
}
