import type { ReactNode } from "react";
import { twMerge } from "tailwind-merge";
import { TEXT_TITLE, TRAY, TRAY_PANEL, splitTray } from "@/components/kit/styles";

/**
 * The card every screen builds on, in the one card look (TRAY): a grey tray with the white panel
 * inside it that holds the content. Where it sits and how big it is go on the tray, its own layout
 * and padding on the panel. Use trayClassName and panelClassName for explicit styling.
 * Existing className callers still use splitTray. A section
 * heading (`title`, with an optional `sub` line and an `aside` for its controls: a menu, an Add
 * button, a badge) sits on the tray above the panel; the thing's own name stays inside.
 */
export function Card({ title, sub, aside, label, children, className = "", trayClassName = "", panelClassName = "" }: {
  title?: ReactNode;
  sub?: ReactNode;
  aside?: ReactNode;
  /** Names the whole card, including the tray header, as a region. */
  label?: string;
  children?: ReactNode;
  className?: string;
  trayClassName?: string;
  panelClassName?: string;
}) {
  const { tray, panel } = splitTray(className);
  return (
    <section aria-label={label} className={`flex flex-col ${trayClassName ? twMerge(TRAY, tray, trayClassName) : `${TRAY} ${tray}`}`}>
      {title !== undefined && <TrayHeader title={title} sub={sub} aside={aside} />}
      {children !== undefined && children !== null && children !== false && (
        <div className={`min-h-0 flex-1 ${panelClassName ? twMerge(TRAY_PANEL, panel, panelClassName) : `${TRAY_PANEL} ${panel}`}`}>{children}</div>
      )}
    </section>
  );
}

/**
 * A card's heading on its tray: the title (and a line under it), its controls at the right, level
 * with it. Where both won't fit (a phone), the controls wrap under the heading rather than squeeze
 * it: the heading keeps at least 15rem, or the whole row when that's narrower.
 */
function TrayHeader({ title, sub, aside }: { title: ReactNode; sub?: ReactNode; aside?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 px-3 pt-2 pb-2.5">
      <div className="flex min-w-[min(100%,15rem)] flex-1 flex-col gap-0.5">
        <CardHeading>{title}</CardHeading>
        {sub && <p className="text-[12.5px] leading-[1.4] text-ink-2">{sub}</p>}
      </div>
      {aside}
    </div>
  );
}

export function CardTitle({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <h2 className={`${TEXT_TITLE} ${className}`}>{children}</h2>;
}

/** The heading on the settings/profile cards. */
export function CardHeading({ children }: { children: ReactNode }) {
  return (
    <h2 className="font-display text-[18px] leading-[1.5] font-semibold text-ink" style={{ fontVariationSettings: '"opsz" 14' }}>
      {children}
    </h2>
  );
}

export function KeyValue({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-3 rounded bg-surface-2 p-2 leading-[1.2] tracking-[0.2px]">
      <p className="h-3 text-[10px] text-ink-2">{label}</p>
      <p className="text-[14px] text-ink-deep">{value}</p>
    </div>
  );
}
