import { TOOLBAR_BUTTON } from "@/components/portal/toolbar";

/**
 * The bordered frame round a view's grid — the List's table, the Calendar's month, the Timeline's
 * chart, the Workload's grid — with the scroller inside it. The border is on the frame because an
 * outline on the scroller sat under its pinned header and columns, so the edge came and went. Each
 * view adds how it fills the pane (`flex-1`), or not (the Workload is as tall as its rows).
 */
export const VIEW_FRAME = "flex min-h-0 flex-col overflow-hidden rounded-lg border border-border bg-white";

/**
 * "Today" / "This week" over a view: the toolbar's button, greyed while the view already shows it,
 * and 40px on a phone like the view tabs, for a thumb.
 */
export const TODAY_BUTTON = `${TOOLBAR_BUTTON} whitespace-nowrap max-md:h-10 disabled:text-ink-2 disabled:hover:bg-white`;

/** The arrows either side of a view's window (a month, a few weeks): square, the Today button's height and border. */
export const STEP_BUTTON =
  "flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-white text-ink-2 hover:bg-surface-alt hover:text-ink focus-visible:outline-2 focus-visible:outline-primary max-md:size-10";
