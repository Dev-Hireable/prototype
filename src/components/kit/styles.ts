/** The classes in a control's className that place it in its parent, for the span that wraps it (Tip's `wrap`). */
export const layoutClasses = (className: string) =>
  className
    .split(/\s+/)
    .filter((c) => /^(w-full|flex-1|grow|shrink-0|self-\S+|w-\[.+\])$/.test(c))
    .join(" ");

/*
 * The text styles a screen reuses outside a kit component, by what the text is. Each is the size,
 * leading, weight, tracking and colour together, so two screens can't draw the same thing a shade
 * apart. A heading that sits on a card goes through CardTitle or CardHeading instead.
 */

/** A block's heading inside a page or card: Section's title, CardTitle, a dialog's sub-heading. */
export const TEXT_TITLE = "text-[16px] leading-[1.5] font-semibold tracking-[0.2px] text-ink";
/** The name of a field or of a value: Field's label, a review line's label. */
export const TEXT_LABEL = "text-[14px] leading-[1.2] font-semibold tracking-[0.2px] text-ink";
/** Secondary copy at the body size: Field's hint, a line under a heading. */
export const TEXT_BODY = "text-[14px] leading-[1.2] tracking-[0.2px] text-ink-2";
/** A smaller note under a control or a figure. */
export const TEXT_NOTE = "text-[13px] leading-[1.4] tracking-[0.2px] text-ink-2";

/** Shared form-control surface used by text inputs, textareas, and custom selects. */
export const FORM_CONTROL =
  "h-11 w-full rounded-lg border border-border bg-white px-4 text-[14px] leading-[1.2] tracking-[0.2px] text-ink outline-none placeholder:text-ink-2 focus:border-primary disabled:bg-surface-2";

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
 * use it.
 */

/** A 16px outer radius, 4px inset and one subtle structural edge. */
export const TRAY = "rounded-2xl bg-surface-2 p-1 outline -outline-offset-1 outline-line";

/** The 12px panel radius is the outer radius minus the inset. The surface change defines its edge. */
export const TRAY_PANEL = "rounded-xl bg-white";

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

/**
 * The page toolbar's button: 36px, white, bordered — Filter and Sort on a contract's work, Type and
 * Show inactive over the contract lists, Set availability over interviews. One class, so every
 * toolbar's controls share a height and a look with the search box and the view switch beside them.
 */
export const TOOLBAR_BUTTON =
  "inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-white px-3 text-[13px] leading-[1.2] font-medium text-ink transition hover:bg-surface-alt focus-visible:outline-2 focus-visible:outline-primary data-popup-open:bg-surface-2";

/**
 * A table row's main link, stretched over the whole row (the row is `relative`): the row opens it
 * from anywhere, while the buttons in it sit above (`relative z-10`) and stay their own.
 */
export const ROW_LINK =
  "after:absolute after:inset-0 after:content-[''] focus-visible:outline-none focus-visible:after:rounded-lg focus-visible:after:outline-2 focus-visible:after:-outline-offset-2 focus-visible:after:outline-primary";
