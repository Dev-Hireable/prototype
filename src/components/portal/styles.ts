/** The classes in a control's className that place it in its parent, for the span that wraps it (Tip's `wrap`). */
export const layoutClasses = (className: string) =>
  className
    .split(/\s+/)
    .filter((c) => /^(w-full|flex-1|grow|shrink-0|self-\S+|w-\[.+\])$/.test(c))
    .join(" ");

/** Shared form-control surface used by text inputs, textareas, and custom selects. */
export const FORM_CONTROL =
  "h-11 w-full rounded-lg border border-border bg-white px-4 text-[14px] leading-[1.2] tracking-[0.2px] text-ink outline-none placeholder:text-ink-2 focus:border-primary disabled:bg-surface-2";

/**
 * Right padding for the page header rows that Reset demo (@/components/portal/DemoReset) floats
 * over, so nothing in them runs under it: a long title, the offer screens' ×, Admin's header
 * actions. The button is ~106px wide and 20px in from the viewport's edge, 4px of which is the
 * shell's frame; the rest is a gap. The headers make room for the button rather than the other way
 * round, so it sits at the same spot on every screen. A phone's portal screens have no corner
 * button (it's in the Menu sheet), so there the row runs to the page gutter.
 */
export const CLEAR_DEMO_RESET = "pr-36 max-md:pr-(--page-gutter)";

/**
 * A row of filters (a search, then dropdowns and a button) on a phone: the search across the full
 * width, the rest sharing the row under it, two or three to a line. Put it on the row itself.
 */
export const PHONE_FILTER_ROW = "max-md:flex-wrap max-md:gap-2 max-md:*:min-w-[140px] max-md:*:flex-1 max-md:[&>:first-child]:basis-full";

/**
 * A money ledger's columns on the portal's one table (Table): Date · Contract · who · Type · Amount ·
 * Status · View, the Team Builder's Transactions and the Independent's Earnings alike. A phone shows a
 * row as a card of three lines: what it was with the amount at its right, then when and with whom
 * with the status at its right, then the type with View. Two starting widths make those breaks: the
 * contract's leaves room beside it for the amount and nothing else, and the type's for View only.
 * Who it was with takes what its line has left, wrapping inside it, so the status always fits.
 */
export const LEDGER_COLS = [
  "w-[110px] max-md:order-3 max-md:text-ink-2",
  "min-w-0 flex-1 max-md:order-1 max-md:grow! max-md:basis-[calc(100%-7rem)]! max-md:font-medium max-md:whitespace-normal",
  "w-[150px] max-md:order-4 max-md:grow! max-md:basis-0! max-md:text-ink-2",
  "w-[165px] max-md:order-6 max-md:grow! max-md:basis-[calc(100%-5rem)]!",
  "w-[110px] max-md:order-2 max-md:ml-auto max-md:text-[15px] max-md:font-semibold",
  "w-[132px] max-md:order-5 max-md:ml-auto",
  "w-[80px] max-md:order-7 max-md:ml-auto",
];

/**
 * A kanban board's scroller on a phone, where a column is about the screen's width (KanbanColumn): a
 * swipe settles on a column instead of stopping halfway between two. Give it the board's side gutter
 * as its scroll padding too (`max-md:scroll-px-…`), so each column settles where the first one starts.
 */
export const PHONE_BOARD = "max-md:snap-x max-md:snap-mandatory";

/**
 * A screen's one main action (Add task), on a phone: lifted out of its toolbar into a floating
 * button in the bottom-right corner, just above the tab bar, where the thumb of the hand holding
 * the phone already is. It keeps its label (an extended FAB), so it reads the same as on a desktop.
 * Put it on the Button itself; it changes nothing from a tablet up.
 */
export const PHONE_FAB =
  "max-md:fixed max-md:right-4 max-md:bottom-[calc(5rem+env(safe-area-inset-bottom))] max-md:z-30 max-md:h-14 max-md:rounded-2xl max-md:px-5 max-md:text-[15px] max-md:shadow-[0_6px_20px_rgba(0,0,0,0.22)]";

/** The same button on a tablet, where there's no tab bar under it: the bottom-right corner itself. */
export const TABLET_FAB =
  "md:max-lg:fixed md:max-lg:right-6 md:max-lg:bottom-6 md:max-lg:z-30 md:max-lg:h-12 md:max-lg:rounded-2xl md:max-lg:px-5 md:max-lg:shadow-[0_6px_20px_rgba(0,0,0,0.22)]";

/**
 * Every icon-only button — a kebab (⋮ ⋯), a close ×, a + — looks the same: a circle, grey at rest,
 * a grey wash on hover, the accent tint while the menu it opens is open. Only the size changes with
 * where it sits (pass `size-*`). Chip and filter × stay as they are: they're part of the chip. On a
 * touch screen each takes a finger-sized tap (`hit-area`, globals.css), however small it's drawn.
 */
export const ICON_BUTTON =
  "hit-area flex shrink-0 items-center justify-center rounded-full text-ink-2 transition hover:bg-surface-alt hover:text-ink focus-visible:outline-2 focus-visible:outline-primary data-popup-open:bg-accent-bg data-popup-open:text-accent-ink";

/*
 * The one card look: a grey tray with a white panel inside it. The panel holds the thing itself (a
 * task's name, a candidate, a role); the tray round it holds what's said about it (a heading above;
 * dates, counts and the next step below), so every card reads in the same two layers. Every kanban
 * card (the work board, the candidate pipeline, My Applications) and the dashboards' summary cards
 * use it. Both edges are outlines, which cost no layout; rows with a background inside a panel stay
 * position: static, or they paint over its edge.
 */

/** The tray: grey, a hairline edge, 4px of it showing round the panel. */
export const TRAY = "rounded-xl bg-surface-2 p-1 outline -outline-offset-1 outline-border";

/** The white panel inside, with a lighter edge than the tray's. */
export const TRAY_PANEL = "rounded-lg bg-white outline -outline-offset-1 outline-[#e3e3e3]";

/** What sits on the tray under the panel, inset to line up with a p-3 panel's content (one left edge). */
export const TRAY_FOOT = "px-3 pt-2 pb-1.5";

/** The classes that place and size a card in its parent: they go on its tray, the rest on its panel. */
const TRAY_PLACEMENT = /^(?:[\w-]+:)*!?(?:-?m[trblxy]?-|w-|min-w-|max-w-|h-|min-h-|max-h-|flex-1$|flex-none$|grow|shrink|basis-|self-|order-|col-|row-)/;

/**
 * Splits a card's className between its tray (where it sits and how big it is) and its panel (its
 * own layout and padding). A card's corners are the tray's, so a `rounded-*` it was given goes.
 */
export function splitTray(className: string) {
  const classes = className.split(/\s+/).filter((c) => c && !/^(?:[\w-]+:)*rounded/.test(c));
  return { tray: classes.filter((c) => TRAY_PLACEMENT.test(c)).join(" "), panel: classes.filter((c) => !TRAY_PLACEMENT.test(c)).join(" ") };
}
