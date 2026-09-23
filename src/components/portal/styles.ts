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
