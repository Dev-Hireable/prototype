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
 * round, so it sits at the same spot on every screen.
 */
export const CLEAR_DEMO_RESET = "pr-36";

/**
 * Every icon-only button — a kebab (⋮ ⋯), a close ×, a + — looks the same: a circle, grey at rest,
 * a grey wash on hover, the accent tint while the menu it opens is open. Only the size changes with
 * where it sits (pass `size-*`). Chip and filter × stay as they are: they're part of the chip.
 */
export const ICON_BUTTON =
  "flex shrink-0 items-center justify-center rounded-full text-ink-2 transition hover:bg-surface-alt hover:text-ink focus-visible:outline-2 focus-visible:outline-primary data-popup-open:bg-accent-bg data-popup-open:text-accent-ink";
