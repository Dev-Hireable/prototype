import Link from "next/link";
import type { ReactNode } from "react";
import { ICONS } from "@/components/admin/icons";

/**
 * One type scale for every breadcrumb and back link in the app. They used to be written per page
 * — 13px here, 14px on the kanban, 12px accent in admin — so the same control changed size as you
 * moved between screens. Import this rather than restating it.
 */
export const NAV_TEXT = "text-[13px] leading-[1.4] font-medium";
/**
 * The chevron both of them use — the back link's arrow and the breadcrumb's separator — at one
 * size. The back arrow used to be 18px beside a text "›" in the crumbs, so "Back to…" read a size
 * bigger than a breadcrumb set in the same 13px.
 */
const CHEVRON = 16;

/**
 * The fixed slot a breadcrumb or back link lives in: its own row directly under the page header, in
 * the page gutter, never mixed into page content. `Page` and `AdminPage` render it, so a page passes
 * `nav={<BackLink …/>}` instead of putting the link somewhere in `children`.
 */
export function PageNav({ children, actions }: { children: ReactNode; actions?: ReactNode }) {
  return (
    /* A fixed 40px — a button's height — never `min-h`: the row must not resize for its contents,
       or the page below it moves depending on whether this page has actions and on how long the
       breadcrumb happens to be. The crumb truncates rather than wrapping to a second line. */
    <div className="flex h-10 shrink-0 items-center justify-between gap-3">
      <div className="min-w-0 truncate">{children}</div>
      {/* Page-level actions ride on this row rather than pushing the content below down a line. */}
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Breadcrumb({ items }: { items: (string | { label: string; href: string })[] }) {
  const Sep = ICONS.chevronRight;
  return (
    // Inline, not flex: PageNav truncates a long trail with an ellipsis, which only works on text.
    <p className={`${NAV_TEXT} whitespace-nowrap text-ink-2`}>
      {items.map((it, i) => (
        <span key={i}>
          {i > 0 && <Sep size={CHEVRON} aria-hidden className="mx-1 inline-block -translate-y-px align-middle" />}
          {typeof it === "string" ? (
            it
          ) : (
            <Link href={it.href} className="hover:text-accent">
              {it.label}
            </Link>
          )}
        </span>
      ))}
    </p>
  );
}

const BACK_CLASS = `${NAV_TEXT} inline-flex items-center gap-1 text-ink-2 hover:text-accent`;

export function BackLink({ href, children }: { href: string; children: ReactNode }) {
  const L = ICONS.chevronLeft;
  return (
    <Link href={href} className={BACK_CLASS}>
      <L size={CHEVRON} aria-hidden /> {children}
    </Link>
  );
}

/** A BackLink that runs a handler instead of navigating — a wizard stepping back — with the same look and slot. */
export function BackButton({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  const L = ICONS.chevronLeft;
  return (
    <button type="button" onClick={onClick} className={BACK_CLASS}>
      <L size={CHEVRON} aria-hidden /> {children}
    </button>
  );
}
