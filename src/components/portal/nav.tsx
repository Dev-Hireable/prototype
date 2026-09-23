import Link from "next/link";
import type { ReactNode } from "react";
import { ICONS } from "@/components/admin/icons";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList } from "@/components/ui/breadcrumb";

/**
 * The fixed slot a breadcrumb or back link lives in: its own row directly under the page header, in
 * the page gutter, never mixed into page content. `Page` and `AdminPage` render it, so a page passes
 * `nav={<BreadcrumbBack …/>}` or a `<Breadcrumb>` trail instead of putting it in `children`.
 *
 * The links themselves are shadcn's Breadcrumb (@/components/ui/breadcrumb) — back links are built
 * from the same pieces, so the two can't drift apart in size the way two hand-made components did.
 */
export function PageNav({ children, actions }: { children: ReactNode; actions?: ReactNode }) {
  return (
    /* A fixed 40px — a button's height — never `min-h`: the row must not resize for its contents,
       or the page below it moves depending on whether this page has actions and on how long the
       breadcrumb happens to be. The crumb truncates rather than wrapping to a second line. */
    <div className="flex h-10 shrink-0 items-center justify-between gap-3">
      <div className="min-w-0">{children}</div>
      {/* Page-level actions ride on this row rather than pushing the content below down a line. */}
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}

/**
 * "‹ Back to …" — a one-item shadcn Breadcrumb, so a back link and a trail are the same size, weight
 * and colour by construction. `href` navigates; `onClick` runs a handler instead (a wizard stepping
 * back), in the same look.
 */
export function BreadcrumbBack({ children, ...to }: { children: ReactNode } & ({ href: string; onClick?: never } | { onClick: () => void; href?: never })) {
  const Back = ICONS.chevronLeft;
  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink
            render={to.href !== undefined ? <Link href={to.href} /> : <button type="button" onClick={to.onClick} />}
            className="inline-flex min-w-0 items-center gap-1"
          >
            <Back size={16} aria-hidden className="shrink-0" />
            <span className="truncate">{children}</span>
          </BreadcrumbLink>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );
}
