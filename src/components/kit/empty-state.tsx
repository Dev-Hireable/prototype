import type { ReactNode } from "react";

/**
 * The one "nothing here" box: a title, a line or two on why and what next, and the way on. `icon`
 * puts a glyph in a white circle over the title (the workspace's empty and error states); `action`
 * may hold more than one button, centred in a row. `className` sizes it (a max width, say).
 */
export function EmptyState({ icon, title, body, action, className = "" }: { icon?: ReactNode; title: string; body?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={`flex flex-col items-center gap-3 rounded-lg bg-surface-alt px-6 py-12 text-center outline -outline-offset-1 outline-border ${className}`}>
      {icon && <span className="flex size-11 items-center justify-center rounded-full bg-white text-ink-2 outline -outline-offset-1 outline-border">{icon}</span>}
      <h2 className="text-[16px] leading-[1.4] font-semibold text-ink">{title}</h2>
      {body && <div className="text-[13px] leading-[1.5] text-ink-2">{body}</div>}
      {action && <div className="mt-2 flex flex-wrap justify-center gap-2">{action}</div>}
    </div>
  );
}
