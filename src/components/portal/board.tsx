"use client";

import { useEffect, useRef, type ComponentProps, type ReactNode } from "react";
import { revealInRow } from "@/lib/portal/reveal";

/** A column's colours: the header's fill and text, and the darker chip its count sits in. */
export type ColumnColors = { bg: string; text: string; count: string };

/**
 * How a column's frame reads: at rest, open to the card being dragged, with the card over it, or
 * just jumped to (the pipeline's `?stage=` link).
 */
export type ColumnFrame = "rest" | "target" | "over" | "focused";

const FRAME: Record<ColumnFrame, string> = {
  rest: "border-transparent bg-[#f7f7f7]",
  target: "border-dashed border-[#9fc9ea] bg-[#f7fbfe]",
  over: "border-accent-soft bg-accent-bg",
  focused: "border-accent-soft bg-accent-bg",
};

/**
 * Every kanban column in the app — the candidate pipeline, My Applications and a contract's work
 * board: a grey panel as tall as its cards, up to the board's height, its name and count on the
 * column's tint, the cards scrolling inside it once it's full, and room at the foot for an add
 * button. It used to stretch to the board's full height whatever it held, so a column with one card
 * ran to the bottom of the page as a long empty panel. The frame is a real 2px
 * border, transparent at rest, so it can light up without the cards shifting. On a phone a column is
 * the screen's width less a sliver of the next one, which says there's more to swipe to; the board
 * settles on a column at a time (PHONE_BOARD) and its chips jump between them (KanbanJump).
 */
export function KanbanColumn({
  label,
  count,
  colors,
  unit = ["item", "items"],
  aside,
  frame = "rest",
  dimmed = false,
  notice,
  footer,
  width = "min-w-[280px] max-w-[400px] flex-1",
  className = "",
  children,
  ...rest
}: {
  label: string;
  count: number;
  colors: ColumnColors;
  /** What the count counts, for the column's accessible name: "To do, 3 items". */
  unit?: [one: string, many: string];
  /** The right end of the header: an effort total, say. */
  aside?: ReactNode;
  frame?: ColumnFrame;
  /** Faded while a dragged card can't go here. */
  dimmed?: boolean;
  /** A line under the header, for a moment (why a card can't be dropped here). */
  notice?: ReactNode;
  footer?: ReactNode;
  /**
   * The column's width, as a class. By default the columns share the board's width, between 280 and
   * 400px — room for a card's details — so a board of four fits a 14" laptop (at its 90% UI scale)
   * instead of scrolling; more than fit, it scrolls.
   */
  width?: string;
  className?: string;
  children: ReactNode;
} & Omit<ComponentProps<"section">, "children" | "className">) {
  return (
    <section
      aria-label={`${label}, ${count} ${count === 1 ? unit[0] : unit[1]}`}
      {...rest}
      className={`flex max-h-full shrink-0 flex-col self-start rounded-xl border-2 transition-colors ${FRAME[frame]} ${dimmed ? "opacity-60" : ""} ${width} max-md:w-[calc(100vw-48px)] max-md:max-w-none max-md:min-w-0 max-md:flex-none max-md:snap-start ${className}`}
    >
      <header className="flex shrink-0 items-center justify-between gap-2 rounded-t-[10px] px-3 py-2 text-[14px] leading-[1.2] font-medium tracking-[0.2px]" style={{ background: colors.bg, color: colors.text }}>
        <span className="flex min-w-0 items-center gap-2">
          <span className="truncate">{label}</span>
          <CountPill background={colors.count} aria-hidden>
            {count}
          </CountPill>
        </span>
        {aside}
      </header>
      {notice}
      {children}
      {footer && <div className="shrink-0 p-2 pt-0">{footer}</div>}
    </section>
  );
}

/**
 * A group's count on its colours: the chip beside a kanban column's name, a List group's and a
 * Timeline band's heading, the Needs attention panel's and Unscheduled's. `background` is the
 * group's darker count colour (ColumnColors.count); `className` brings a fill and text colour
 * instead, for a count with no group colours.
 */
export function CountPill({ background, className = "", children, ...rest }: { background?: string } & ComponentProps<"span">) {
  return (
    <span {...rest} className={`min-w-7 rounded px-1.5 py-0.5 text-center text-[12.5px] font-medium tabular-nums ${className}`} style={background ? { background } : undefined}>
      {children}
    </span>
  );
}

/**
 * A column's cards: they scroll inside the panel, under its header. The list is positioned, so what
 * a card places absolutely (sr-only text) stays inside it instead of stretching the page.
 */
export function KanbanList({ className = "", children, ...rest }: ComponentProps<"ul">) {
  return (
    <ul aria-label="Cards" {...rest} className={`relative flex min-h-16 flex-1 flex-col gap-2 overflow-y-auto p-2 ${className}`}>
      {children}
    </ul>
  );
}

/** What an empty column says, in the slot its first card would take. */
export function KanbanEmpty({ children }: { children: ReactNode }) {
  return <li className="rounded-lg border border-dashed border-border px-3 py-6 text-center text-[12.5px] leading-[1.4] text-ink-2">{children}</li>;
}

/**
 * A phone's way round a board it shows a column at a time: a chip per column with its count, the one
 * in view in its column's colours, a tap bringing that column in (useBoardJump). From a tablet up the
 * columns sit side by side and it isn't drawn. `className` is the row's side gutter, the board's own.
 */
export function KanbanJump({ columns, current, onJump, label, className = "px-(--page-gutter)" }: { columns: { key: string; label: string; count: number; colors: ColumnColors }[]; current: string | null; onJump: (key: string) => void; label: string; className?: string }) {
  const row = useRef<HTMLDivElement>(null);
  // As the board is swiped, the lit chip is kept in sight: the row scrolls, never the page.
  useEffect(() => {
    const chip = row.current?.querySelector<HTMLElement>("[aria-current]");
    if (row.current && chip) revealInRow(row.current, chip);
  }, [current]);
  return (
    <nav aria-label={label} className="md:hidden">
      <div ref={row} className={`flex gap-2 overflow-x-auto ${className}`}>
        {columns.map((c) => {
          const on = c.key === current;
          return (
            <button
              key={c.key}
              type="button"
              aria-current={on || undefined}
              onClick={() => onJump(c.key)}
              className={`flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3 text-[13px] leading-none font-medium transition-colors focus-visible:outline-2 focus-visible:outline-primary ${on ? "" : "bg-surface-2 text-ink"}`}
              style={on ? { background: c.colors.bg, color: c.colors.text } : undefined}
            >
              {c.label}
              <span className={`min-w-5 rounded px-1 py-0.5 text-center text-[12px] tabular-nums ${on ? "" : "bg-white text-ink-2"}`} style={on ? { background: c.colors.count } : undefined}>
                {c.count}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
