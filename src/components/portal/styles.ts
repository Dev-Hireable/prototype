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
 * where it sits (pass `size-*`). Chip and filter × stay as they are: they're part of the chip.
 */
export const ICON_BUTTON =
  "flex shrink-0 items-center justify-center rounded-full text-ink-2 transition hover:bg-surface-alt hover:text-ink focus-visible:outline-2 focus-visible:outline-primary data-popup-open:bg-accent-bg data-popup-open:text-accent-ink";
