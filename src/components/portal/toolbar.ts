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
