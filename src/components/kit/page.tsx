"use client";

import type { ReactNode } from "react";
import { ICONS } from "@/components/icons";
import { PortalContent } from "@/components/kit/portal-content";
import { PageNav } from "@/components/kit/breadcrumb";
import { ScrollFade } from "@/components/kit/scroll-fade";
import { ICON_BUTTON } from "@/components/kit/styles";

/** A page with its header strip; the close is optional (wizard/offer screens). */
export function Page({
  title,
  onClose,
  tabs,
  badge,
  headerActions,
  nav,
  navActions,
  children,
  padded = true,
  fill = false,
  heading = "display",
}: {
  title: ReactNode;
  onClose?: () => void;
  tabs?: ReactNode;
  badge?: ReactNode;
  /** Actions attached to the page's subject, beside the title. */
  headerActions?: ReactNode;
  /** A `Breadcrumb` trail (@/components/ui/breadcrumb) or a `BreadcrumbBack` (@/components/kit/breadcrumb). It gets its own row under the header rather than sitting in `children`. */
  nav?: ReactNode;
  /** Page-level actions that share the nav row, so they don't cost the page a second row. */
  navActions?: ReactNode;
  children: ReactNode;
  padded?: boolean;
  /**
   * The content takes the rest of the panel as a plain flex column and does its own scrolling —
   * no page scroller and no edge fade, whose mask would fade a workspace's sticky headers.
   */
  fill?: boolean;
  /** One header strip for every page: 24 DM Sans by default; "modal" is the 20 Inter close-button variant (offer / edit screens). */
  heading?: "modal" | "display";
}) {
  const head = (
    <>
      <PageHeader title={title} badge={badge} actions={headerActions} onClose={onClose} tabs={tabs} heading={heading} />
      {nav && <PageNavRow nav={nav} actions={navActions} />}
    </>
  );
  if (fill) return <FillPage head={head} underNav={!!nav}>{children}</FillPage>;
  return (
    <>
      {head}
      <PageScroller padded={padded} underNav={!!nav}>
        {children}
      </PageScroller>
    </>
  );
}

/**
 * A `fill` page: its content takes the rest of the panel as a plain flex column and does its own
 * scrolling (a workspace's views). On a phone the page scrolls as a whole instead, its header and
 * back link included: pinned above the view they took a third of the screen and left the view a
 * strip to scroll in. The workspace pins its own toolbar while the rest goes by.
 */
function FillPage({ head, underNav, children }: { head: ReactNode; underNav: boolean; children: ReactNode }) {
  return (
    // `relative`, so what's placed absolutely inside (sr-only text) stays in the phone's scroll.
    <div className="flex min-h-0 min-w-0 flex-1 flex-col max-md:relative max-md:overflow-y-auto">
      {head}
      {/* The content lines up with the nav row: --ws-gutter is the side gutter a workspace pads its
          toolbar and views with — the page's own. On a phone it's as tall as what's in it (and at
          least the rest of the screen), never squeezed to fit, so the page scrolls, not the view. */}
      <div className={`flex min-h-0 min-w-0 flex-1 flex-col [--ws-gutter:var(--page-gutter)] max-md:flex-[1_0_auto] ${underNav ? "pt-3" : ""}`}>{children}</div>
    </div>
  );
}

/** The header strip: the title and its badge on the one 56px row, the close button, and the tabs hanging below. */
function PageHeader({ title, badge, actions, onClose, tabs, heading }: { title: ReactNode; badge?: ReactNode; actions?: ReactNode; onClose?: () => void; tabs?: ReactNode; heading: "modal" | "display" }) {
  const Close = ICONS.close;
  return (
    <header className="shrink-0 shadow-[inset_0_-1px_0_var(--color-line)]">
      {/* One 56px title row for every heading size. Tabs hang below it. */}
      {/* A phone lets a long title (a role and its company) wrap, the badges after it, rather than clip. */}
      <div className="flex h-14 min-w-0 items-center gap-3 px-(--page-gutter) max-md:h-auto max-md:min-h-14 max-md:py-2">
        <h1
          className={`flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-ink max-md:leading-[1.3] ${
            heading === "display"
              ? "font-display text-[24px] leading-[1.5] font-semibold tracking-[0.2px] max-md:text-[20px]"
              : "text-[20px] leading-[1.5] font-semibold tracking-[0.4px] max-md:text-[18px]"
          }`}
          style={heading === "display" ? { fontVariationSettings: '"opsz" 14' } : undefined}
        >
          {title}
          {badge}
        </h1>
        {/* At the row's far end, apart from the title and its badges, where a page's own actions sit. */}
        {actions && <div className="ml-auto flex shrink-0 items-center gap-2">{actions}</div>}
        {onClose && (
          <button type="button" onClick={onClose} aria-label="Close" className={`${ICON_BUTTON} -mr-1.5 ml-auto size-10`}>
            <Close size={24} aria-hidden />
          </button>
        )}
      </div>
      {/* No bottom padding: the active tab's 2px underline has to sit on the header's own rule, not float above it. */}
      {tabs && <div className="px-(--page-gutter)">{tabs}</div>}
    </header>
  );
}

/**
 * Back links and breadcrumbs stay under the header at the same fixed gutter as the title and tabs.
 */
function PageNavRow({ nav, actions }: { nav: ReactNode; actions?: ReactNode }) {
  return (
    <div className="shrink-0 px-(--page-gutter) pt-4">
      <PageNav actions={actions}>{nav}</PageNav>
    </div>
  );
}

/**
 * A page that isn't `fill`: its content in the page scroller, which runs to the panel's edges — a
 * padded page's gutters are padding inside it, around the centred column.
 */
function PageScroller({ padded, underNav, children }: { padded: boolean; underNav: boolean; children: ReactNode }) {
  return (
    // Only the top gutter is on this wrapper. The side and bottom gutters are padding inside the
    // scroller, so the scroller — and its scrollbar — runs to the panel's edges on every page: the
    // bar sits 8px from the edge here just as on the full-bleed pages, and content fades out at the
    // edge instead of stopping short. With the gutters out here the vertical bar floated 40px in
    // from the right, and content cut off 40px above the bottom over an empty strip. The content
    // itself doesn't move: the padding keeps it exactly where the wrapper did. The width cap goes on
    // the inner column. Full-bleed pages set their own gutters.
    <div className={`flex min-h-0 flex-1 ${padded ? (underNav ? "pt-4" : "pt-4 md:pt-6") : ""}`}>
      <ScrollFade className="flex w-full min-w-0">
        {/* Full-bleed pages get a flex column, so a full-height child (the kanban boards) grows into
            the space left under the header and nav row instead of overflowing it. pb-12 is the 40px
            gutter plus the column's own 8px, as before; `min-h-full` counts it (border-box), so a
            page that fits doesn't gain any scroll. */}
        <div className={`edge-fade w-full overflow-y-auto ${padded ? "px-(--page-gutter)" : "flex flex-col"}`}>{padded ? <PortalContent className="min-h-full pb-12">{children}</PortalContent> : children}</div>
      </ScrollFade>
    </div>
  );
}
