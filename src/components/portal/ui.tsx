"use client";

import { Tip } from "@/components/portal/tip";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useEffectEvent, useId, useRef, useState, useSyncExternalStore, type KeyboardEvent, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";
import { ICONS } from "@/components/icons";
import { Badge } from "@/components/portal/badge";
import type { Tone } from "@/lib/portal/tone";
import { PIPELINE, type Stage } from "@/lib/portal/stages";
import { PortalContent } from "@/components/portal/layout";
import { PageNav } from "@/components/portal/nav";
import { ScrollFade } from "@/components/portal/scroll-fade";
import { CLEAR_DEMO_RESET, FORM_CONTROL, ICON_BUTTON, layoutClasses } from "@/components/portal/styles";
import { Checkbox as CheckboxControl } from "@/components/ui/checkbox";
import { Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs as TabsRoot, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { JobType } from "@/lib/contract/job-types";
import { keyed } from "@/lib/portal/keys";
import type { PageToast } from "@/lib/portal/toast";

export { KebabMenu, Select } from "@/components/portal/controls";

/* ---------------------------------------------------------------- page ---- */

/** A page with its header strip; the close is optional (wizard/offer screens). */
export function Page({
  title,
  onClose,
  tabs,
  badge,
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
  /** A `Breadcrumb` trail (@/components/ui/breadcrumb) or a `BreadcrumbBack` (@/components/portal/nav). It gets its own row under the header rather than sitting in `children`. */
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
  /**
   * The page's one side gutter: the title, the tabs, the back link and the content all start on
   * the same line — the 40px the content has always used. A filled page (a workspace) tightens it
   * to 16px on a phone.
   */
  const inset = fill ? "pl-10 max-sm:pl-4" : "pl-10";
  return (
    <>
      <PageHeader title={title} badge={badge} onClose={onClose} tabs={tabs} inset={inset} heading={heading} />
      {nav && <PageNavRow nav={nav} actions={navActions} fill={fill} />}
      {/* A filled page's content lines up with the nav row: --ws-gutter is the side gutter a
          workspace pads its toolbar and views with — the same 40px, or 16px on a phone. */}
      {fill ? (
        <div className={`flex min-h-0 min-w-0 flex-1 flex-col [--ws-gutter:2.5rem] max-sm:[--ws-gutter:1rem] ${nav ? "pt-3" : ""}`}>{children}</div>
      ) : (
        <PageScroller padded={padded} underNav={!!nav}>
          {children}
        </PageScroller>
      )}
    </>
  );
}

/** The header strip: the title and its badge on the one 56px row, the close button, and the tabs hanging below. */
function PageHeader({ title, badge, onClose, tabs, inset, heading }: { title: ReactNode; badge?: ReactNode; onClose?: () => void; tabs?: ReactNode; inset: string; heading: "modal" | "display" }) {
  const Close = ICONS.close;
  return (
    <header className="shrink-0 shadow-[inset_0_-1px_0_#c3c3c3]">
      {/* One 56px title row for every heading size, so the title sits at the same spot on every page; tabs hang below it.
          It ends short of the Reset demo button floating in the corner (CLEAR_DEMO_RESET). */}
      <div className={`flex h-14 items-center justify-between gap-3 ${inset} ${CLEAR_DEMO_RESET}`}>
        <h1
          className={`flex items-center gap-2 text-ink ${
            heading === "display"
              ? "font-display text-[24px] leading-[1.5] font-semibold tracking-[0.2px]"
              : "text-[20px] leading-[1.5] font-semibold tracking-[0.4px]"
          }`}
          style={heading === "display" ? { fontVariationSettings: '"opsz" 14' } : undefined}
        >
          {title}
          {badge}
        </h1>
        {onClose && (
          <button type="button" onClick={onClose} aria-label="Close" className={`${ICON_BUTTON} -mr-1.5 size-10`}>
            <Close size={24} aria-hidden />
          </button>
        )}
      </div>
      {/* No bottom padding: the active tab's 2px underline has to sit on the header's own rule, not float above it. */}
      {tabs && <div className={`${inset} pr-10`}>{tabs}</div>}
    </header>
  );
}

/**
 * One place for every back link and breadcrumb: pinned under the header, in the 40px page gutter,
 * outside the centred content column — so it sits at the same spot on every page, padded or
 * full-bleed, at any window width, and never scrolls away. It used to live inside each layout's own
 * column, so it moved between pages (and the wizard drew its own). Pages whose back link only
 * sometimes appears still pass `nav`, so the row is always reserved.
 */
function PageNavRow({ nav, actions, fill }: { nav: ReactNode; actions?: ReactNode; fill: boolean }) {
  return (
    <div className={`shrink-0 px-10 pt-4 ${fill ? "max-sm:px-4" : ""}`}>
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
    // the inner column, matching AdminPage. 40px matches DashboardFrame's own gutter, so every
    // portal page sits the same distance from the shell. `padded={false}` pages set their own
    // (wizards, the kanban, the dashboards). Under a nav row the top gutter shrinks: the row already
    // spaces it.
    <div className={`flex min-h-0 flex-1 ${padded ? (underNav ? "pt-4" : "pt-10") : ""}`}>
      <ScrollFade className="flex w-full min-w-0">
        {/* Full-bleed pages get a flex column, so a full-height child (the kanban boards) grows into
            the space left under the header and nav row instead of overflowing it. pb-12 is the 40px
            gutter plus the column's own 8px, as before; `min-h-full` counts it (border-box), so a
            page that fits doesn't gain any scroll. */}
        <div className={`edge-fade w-full overflow-y-auto ${padded ? "px-10" : "flex flex-col"}`}>{padded ? <PortalContent className="min-h-full pb-12">{children}</PortalContent> : children}</div>
      </ScrollFade>
    </div>
  );
}

/* Back links and breadcrumbs: shadcn's Breadcrumb (@/components/ui/breadcrumb) and BreadcrumbBack
   (@/components/portal/nav), shared with admin. */

/* ------------------------------------------------------------- buttons ---- */

/** `danger` is the one destructive button — the standard solid red, white text — on the button that
 *  opens a confirm (Remove, Decline, Drop, End contract) and on the confirm itself. There was a red
 *  outline variant for the first; the user wanted the plain standard red everywhere instead. */
type Variant = "primary" | "secondary" | "danger" | "ghost" | "dark";

const BTN: Record<Variant, string> = {
  primary: "bg-primary text-white hover:brightness-110 disabled:bg-[#e5e5e5] disabled:text-[#c3c3c3]",
  secondary: "border border-border bg-white text-ink hover:bg-surface-alt disabled:border-transparent disabled:bg-[#e5e5e5] disabled:text-[#c3c3c3]",
  // Disabled reads grey like every other disabled button, not a faded red.
  danger: "bg-danger text-white hover:bg-danger-hover disabled:bg-[#e5e5e5] disabled:text-[#c3c3c3]",
  ghost: "text-ink hover:bg-surface-alt",
  dark: "bg-ink text-white",
};

/**
 * Radius, weight and gap live here rather than on the shared base so a size can differ without
 * `!important` — Tailwind can't resolve two same-property utilities by class order.
 *
 * There was an `xs` (28px, 10px regular, pill) for the "Join" chip. It was the only text on the
 * dashboards under 12px and its target was well below 44px, so the two Join buttons moved up to
 * 40px and it has no callers left.
 */
const BTN_SIZE = {
  sm: "h-9 gap-2 rounded-lg px-3 text-[12px] font-medium",
  md: "h-10 gap-2 rounded-lg px-4 text-[14px] font-medium",
  lg: "h-11 gap-2 rounded-lg px-5 text-[14px] font-medium",
  xl: "h-12 gap-2 rounded-lg px-5 text-[16px] font-medium",
};

export function Button({
  children,
  variant = "secondary",
  size = "md",
  onClick,
  disabled,
  title,
  type = "button",
  className = "",
}: {
  children: ReactNode;
  variant?: Variant;
  size?: "sm" | "md" | "lg" | "xl";
  onClick?: () => void;
  disabled?: boolean;
  /** Why a disabled button is disabled — the only affordance a greyed-out control has. Shown as the
   *  app's tooltip (Tip), not the browser's, which never appears on a disabled button. */
  title?: string;
  type?: "button" | "submit";
  className?: string;
}) {
  const sz = BTN_SIZE[size];
  return (
    <Tip label={title} wrap={disabled} wrapClassName={layoutClasses(className)}>
      <button type={type} onClick={onClick} disabled={disabled} className={`inline-flex items-center justify-center whitespace-nowrap transition disabled:cursor-not-allowed ${sz} ${BTN[variant]} ${className}`}>
        {children}
      </button>
    </Tip>
  );
}

export function LinkButton({
  href,
  children,
  variant = "secondary",
  size = "md",
  className = "",
  external = false,
}: {
  href: string;
  children: ReactNode;
  variant?: Variant;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  /** Another site: opens in a new tab rather than routing inside the app. */
  external?: boolean;
}) {
  const sz = BTN_SIZE[size];
  const cls = `inline-flex items-center justify-center whitespace-nowrap transition ${sz} ${BTN[variant]} ${className}`;
  if (external)
    return (
      <a href={href} target="_blank" rel="noreferrer" className={cls}>
        {children}
      </a>
    );
  return (
    <Link href={href} className={cls}>
      {children}
    </Link>
  );
}

/** Every "Message …" action: the conversation icon plus the label, never a bare text button. */
export function MessageButton({ href, children = "Message", size = "md", className = "" }: { href: string; children?: ReactNode; size?: "sm" | "md" | "lg" | "xl"; className?: string }) {
  const Chat = ICONS.messages;
  return (
    <LinkButton href={href} size={size} className={className}>
      <Chat size={size === "sm" ? 16 : 18} aria-hidden />
      {children}
    </LinkButton>
  );
}

/* -------------------------------------------------------------- surfaces -- */

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-lg bg-white outline -outline-offset-1 outline-border ${className}`}>{children}</section>;
}

export function CardTitle({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <h2 className={`text-[16px] leading-[1.5] font-semibold tracking-[0.2px] text-ink ${className}`}>{children}</h2>;
}

/** The heading on the settings/profile cards. */
export function CardHeading({ children }: { children: ReactNode }) {
  return (
    <h2 className="font-display text-[18px] leading-[1.5] font-semibold text-ink" style={{ fontVariationSettings: '"opsz" 14' }}>
      {children}
    </h2>
  );
}

export function KeyValue({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-3 rounded bg-surface-2 p-2 leading-[1.2] tracking-[0.2px]">
      <p className="h-3 text-[10px] text-ink-2">{label}</p>
      <p className="text-[14px] text-[#101828]">{value}</p>
    </div>
  );
}

export function EmptyState({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg bg-[#fafafa] px-6 py-12 text-center outline -outline-offset-1 outline-border">
      <p className="text-[16px] font-semibold text-ink">{title}</p>
      <p className="text-[12px] text-ink-2">{body}</p>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

/**
 * An inline note, as wide as what it says (up to its column) — full width left a one-line note
 * trailing a band of empty colour. A strip across the top of a panel passes its own className
 * (no rounding, no w-fit) and spans the panel.
 */
export function InfoBanner({ children, tone = "info", className = "w-fit max-w-full rounded-lg", onClose }: { children: ReactNode; tone?: "info" | "warn"; className?: string; /** A banner that can be put away: the toast's × at its end. */ onClose?: () => void }) {
  const I = tone === "info" ? ICONS.info : ICONS.warning;
  return (
    <div className={`flex items-start gap-4 p-4 text-[14px] leading-[1.2] tracking-[0.2px] ${tone === "info" ? "bg-[#ccedff] text-[#003049]" : "bg-[#fff3cc] text-[#8e6f12]"} ${className}`}>
      <I size={20} aria-hidden className="shrink-0" />
      {/* The rest of the banner, so a strip's action can sit at its right end. A 20px line, the icon's
          height, so the first line sits level with the icon rather than riding above its middle. */}
      <span className="min-w-0 flex-1 leading-5 [overflow-wrap:anywhere]">{children}</span>
      {onClose && (
        // Pulled into the 20px line, so the × sits level with the icon and the first line of text.
        <button type="button" onClick={onClose} aria-label="Dismiss" className={`${ICON_BUTTON} -my-1 -mr-1.5 size-7`}>
          <ICONS.close size={16} aria-hidden />
        </button>
      )}
    </div>
  );
}

/* --------------------------------------------------------------- badges --- */

/** Trial orange, full-time blue, part-time magenta: solid, white text — the shared Badge. */
export function JobBadge({ type }: { type: JobType }) {
  return (
    <Badge variant="solid" tone={type} caps>
      {type}
    </Badge>
  );
}

/**
 * Match pill: one gradient for every score; 0 = grey placeholder.
 * `coded` switches to the TB-012 traffic light — yellow (medium), grey (low) — used on the
 * Discover talent cards where the AC asks for it. The high band keeps the gradient so a strong
 * score looks the same here as on the profile sheet. `title` carries the tooltip explaining
 * what the score is based on. `lg` is the same pill at the profile header's size, beside a 32px name.
 */
export function MatchPill({ pct, coded = false, title, size = "md" }: { pct: number; coded?: boolean; title?: string; size?: "md" | "lg" }) {
  const tone = pct >= 60 ? "bg-[#f2c94c] text-[#5c4708]" : "bg-[#e5e5e5] text-[#616161]";
  const base = `inline-flex items-center rounded leading-[1.2] font-medium tracking-[0.2px] whitespace-nowrap ${size === "lg" ? "h-8 px-3 text-[14px]" : "h-6 px-2 text-[12px]"}`;
  if (coded && pct && pct < 80) {
    return (
      <Tip label={title}>
        <span className={`${base} ${tone}`}>{pct}% match</span>
      </Tip>
    );
  }
  return (
    <Tip label={title}>
      <span
        className={`${base} ${pct ? "text-white" : "bg-[#e5e5e5] text-[#c3c3c3]"}`}
        style={pct ? { backgroundImage: "linear-gradient(101.96deg, #afd845 0%, #27ae60 60.58%, #098be2 121.16%)" } : undefined}
      >
        {pct}% match
      </span>
    </Tip>
  );
}

/** A tinted status pill — the shared Badge. It used to lead with a 6px dot, which said nothing the
 *  pill didn't already; the name stays so the call sites don't change. */
export function StatusDot({ tone, children }: { tone: Tone; children: ReactNode }) {
  return <Badge tone={tone}>{children}</Badge>;
}

export function Chip({ children, onRemove, size = "md" }: { children: ReactNode; onRemove?: () => void; size?: "sm" | "md" }) {
  const X = ICONS.close;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded bg-surface-2 leading-[1.2] font-medium tracking-[0.2px] whitespace-nowrap text-ink-2 shadow-[inset_0_0_0_0.5px_#c3c3c3] ${
        size === "sm" ? "h-6 px-2 text-[12px]" : "h-8 px-3 text-[14px]"
      }`}
    >
      {children}
      {onRemove && (
        <button type="button" onClick={onRemove} aria-label="Remove" className="text-ink-2">
          <X size={12} aria-hidden />
        </button>
      )}
    </span>
  );
}

export function Initials({ text, className = "size-11 text-[14px]" }: { text: string; className?: string }) {
  return <span className={`inline-flex shrink-0 items-center justify-center rounded-lg bg-[#e8f1fa] leading-[1.4] font-semibold text-primary ${className}`}>{text}</span>;
}

/* --------------------------------------------------------------- people --- */

export function Avatar({ src, size = 40, className = "" }: { src: string; size?: number; className?: string }) {
  return <Image src={src} alt="" width={size * 2} height={size * 2} className={`shrink-0 rounded-full bg-[#d2d8db] object-cover object-top ${className}`} style={{ width: size, height: size }} />;
}

/** Table cell "Independent": 40px avatar + name (14 medium primary) + role (13 #616161). */
export function Person({ name, role, avatar, href }: { name: string; role: string; avatar: string; href?: string }) {
  const title = <p className="truncate text-[14px] leading-[1.4] font-medium text-primary">{name}</p>;
  return (
    <span className="flex min-w-0 flex-1 items-center gap-3">
      <Avatar src={avatar} />
      <span className="flex min-w-0 flex-1 flex-col whitespace-nowrap">
        {href ? <Link href={href} className="hover:underline">{title}</Link> : title}
        <p className="truncate text-[13px] leading-[1.4] text-ink-2">{role}</p>
      </span>
    </span>
  );
}

/* ------------------------------------------------------------- controls --- */

export function Field({ label, hint, error, children, className = "" }: { label: ReactNode; hint?: string; /** A validation message — it replaces the hint and is announced as an error. */ error?: string; children: ReactNode; className?: string }) {
  return (
    <label className={`flex flex-col gap-2 ${className}`}>
      <span className="text-[14px] leading-[1.2] font-semibold tracking-[0.2px] text-ink">{label}</span>
      {children}
      {error ? (
        <span role="alert" className="text-[13px] leading-[1.2] tracking-[0.2px] text-danger">
          {error}
        </span>
      ) : (
        hint && <span className="text-[14px] leading-[1.2] tracking-[0.2px] text-ink-2">{hint}</span>
      )}
    </label>
  );
}

const NOOP_SUBSCRIBE = () => () => {};
const CLIENT_MOUNTED = () => true;
const SERVER_MOUNTED = () => false;

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${FORM_CONTROL} ${props.className ?? ""}`} />;
}

/** Takes a ref too (React 19 passes it as a prop), so a form can focus it. */
export function Textarea(props: React.ComponentProps<"textarea">) {
  return <textarea {...props} className={`${FORM_CONTROL} h-auto min-h-16 py-[13.5px] ${props.className ?? ""}`} />;
}

/**
 * Marks every case-insensitive occurrence of `query` inside `text` (TB-009: "matching keywords
 * are highlighted in the results"). An empty query renders the text untouched.
 */
export function Highlight({ text, query }: { text: string; query: string }) {
  const q = query.trim();
  // A span, not a fragment: callers render this inside flex containers, where loose text nodes
  // and <mark> would each become their own flex item and stack instead of flowing inline.
  if (!q) return <span>{text}</span>;
  const parts = text.split(new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "ig"));
  return (
    <span>
      {keyed(parts, (p) => p).map(({ item: part, key }) =>
        part.toLowerCase() === q.toLowerCase() ? (
          <mark key={key} className="rounded-[3px] bg-[#fff2c2] text-inherit">
            {part}
          </mark>
        ) : (
          part
        ),
      )}
    </span>
  );
}

export function SearchBox({ value, onChange, placeholder, className = "" }: { value: string; onChange: (v: string) => void; placeholder: string; className?: string }) {
  const S = ICONS.search;
  const X = ICONS.close;
  return (
    <label className={`flex h-11 items-center gap-2 rounded-lg border border-border bg-white px-4 text-ink-2 ${className}`}>
      <S size={16} aria-hidden />
      {/* Named outright: from the label's content it had no name but its placeholder, and once
          something was typed the Clear search button's name joined it. */}
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="min-w-0 flex-1 bg-transparent text-[14px] leading-[1.2] tracking-[0.2px] text-ink outline-none placeholder:text-ink-2"
      />
      {/* TB-012: an explicit clear button while a search is active — restores the full list. */}
      {value && (
        <button type="button" aria-label="Clear search" onClick={() => onChange("")} className="flex size-5 shrink-0 items-center justify-center rounded-full text-ink-2 hover:bg-surface-alt hover:text-ink">
          <X size={16} aria-hidden />
        </button>
      )}
    </label>
  );
}

/**
 * The app's checkbox: shadcn's (Base UI) box, installed with the CLI into components/ui, inside a
 * label so the text beside it toggles it too. Every checkbox in the portals is this one.
 */
export function Checkbox({ checked, onChange, children, disabled, className = "" }: { checked: boolean; onChange?: (v: boolean) => void; children?: ReactNode; disabled?: boolean; className?: string }) {
  return (
    <label className={`inline-flex items-center gap-2.5 text-[14px] leading-[1.4] text-ink ${disabled ? "opacity-50" : "cursor-pointer"} ${className}`}>
      <CheckboxControl checked={checked} disabled={disabled} onCheckedChange={(v) => onChange?.(v)} className="bg-white" />
      {children}
    </label>
  );
}

/**
 * Rounded pill tabs — "Upcoming (2) / Past (3)", "All / Unread / …", List / Board. One is
 * always chosen: shadcn's ToggleGroup underneath (arrow keys move between them), drawn as pills.
 */
export function Pills<T extends string>({ value, onChange, options, "aria-label": ariaLabel }: { value: T; onChange: (v: T) => void; options: { value: T; label: ReactNode }[]; "aria-label"?: string }) {
  return (
    <ToggleGroup value={[value]} onValueChange={(next) => next[0] && onChange(next[0] as T)} aria-label={ariaLabel} className="flex-wrap">
      {options.map((o) => (
        <ToggleGroupItem
          key={o.value}
          value={o.value}
          className="h-auto gap-1.5 rounded-full bg-surface-2 px-3 py-1.5 text-[13px] leading-[1.4] font-medium text-ink hover:bg-[#e5e5e5] aria-pressed:bg-primary aria-pressed:text-white aria-pressed:hover:bg-primary aria-pressed:hover:text-white"
        >
          {o.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}

/**
 * Underlined tabs — "Dashboard | Evaluation", "Conversations | Applications". A real tablist
 * (shadcn's Tabs, on Base UI): the arrow keys move between tabs and Enter or Space opens one, so
 * moving focus alone never switches the page.
 */
export function Tabs<T extends string>({ value, onChange, options, className = "", "aria-label": ariaLabel }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[]; className?: string; "aria-label"?: string }) {
  return (
    <TabsRoot value={value} onValueChange={(v) => onChange(v as T)} className="gap-0">
      {/* As tall as its tabs, so the open tab's underline lands on the divider under the row. shadcn's
          own height is scoped (group-data-horizontal/tabs:h-8) and outranked a plain h-auto: the 32px
          list left the 36px tabs hanging 2px below it, the underline under the divider. */}
      <TabsList variant="line" activateOnFocus={false} aria-label={ariaLabel} className={`h-auto gap-6 rounded-none p-0 group-data-horizontal/tabs:h-auto ${className}`}>
        {options.map((o) => (
          <TabsTrigger key={o.value} value={o.value} className={UNDERLINE_TAB}>
            {o.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </TabsRoot>
  );
}

/** The look of an underlined tab on shadcn's TabsTrigger: 2px #00a7f8 rule under the open one. */
const UNDERLINE_TAB =
  "h-9 flex-none rounded-none border-0 border-b-2 border-transparent px-0 py-2 text-[14px] leading-[1.2] font-semibold tracking-[0.2px] text-ink-2 shadow-none after:hidden hover:text-ink focus-visible:border-transparent focus-visible:ring-0 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary data-active:border-[#00a7f8] data-active:text-ink";

/* --------------------------------------------------------------- tables --- */

/**
 * Grid cells: every direct child of a header or row is a cell. Each one stretches to the full row
 * height, and `content-center` centres it vertically while keeping it a block, so `truncate` and
 * `text-right` still work inside. `items-center` only affects cells that are themselves flex rows
 * (a stacked cell asks for `!items-start`). Rows are split by a light rule and columns by space
 * alone: a rule between every cell read as a spreadsheet. A cell that wants to fill edge to edge (a
 * coloured stat) opts out of the padding with `!p-0`.
 */
const CELLS = "[&>*]:self-stretch [&>*]:content-center [&>*]:items-center [&>*]:px-3 [&>*]:py-3";

/**
 * The narrowest a table can be before its columns crowd: its fixed widths (`w-[Npx]`), plus each
 * flexible column's floor (`min-w-[Npx]`, or 200px without one). Wider than that the flexible
 * columns take the room; narrower, the table scrolls sideways.
 */
function minWidthOf(cols: string[]) {
  return cols.reduce((sum, c) => sum + Number(c.match(/(?:^|\s)w-\[(\d+)px\]/)?.[1] ?? c.match(/min-w-\[(\d+)px\]/)?.[1] ?? 200), 0);
}

/** A table as a grid. `cols` are Tailwind width classes. */
export function Table({ cols, head, children }: { cols: string[]; head: string[]; children: ReactNode }) {
  return (
    // It sized itself to its longest text (min-w-max), so payments and offers scrolled sideways on
    // a laptop whatever room they had. It fills the page now, and only scrolls once the page is
    // narrower than its columns need — which still keeps a narrow pane from crushing them together.
    <div className="w-full overflow-x-auto rounded-lg bg-white outline -outline-offset-1 outline-border">
      <div style={{ minWidth: minWidthOf(cols) }}>
        <div className={`flex bg-surface-2 text-[13px] leading-[1.4] font-medium whitespace-nowrap text-ink-2 ${CELLS}`}>
          {head.map((h, i) => (
            <span key={h} className={cols[i]}>
              {h}
            </span>
          ))}
        </div>
        {children}
      </div>
    </div>
  );
}

export function Row({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`flex border-t border-[#e5e5e5] text-[13px] leading-[1.4] whitespace-nowrap text-ink hover:bg-surface-alt/60 ${CELLS} ${className}`}>{children}</div>;
}

/** Search + dropdowns on the left, a count or a button on the right. */
export function Toolbar({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      {children}
      <span className="flex-1" />
      {right}
    </div>
  );
}

/**
 * TB-012 — the page numbers come from the real result count and Previous/Next actually move.
 */
export function Pagination({ page, pages, onChange }: { page: number; pages: number; onChange: (p: number) => void }) {
  const Prev = ICONS.chevronLeft;
  const Next = ICONS.chevronRight;
  if (pages <= 1) return null;

  // Up to 3 numbers around the current page, with an ellipsis before the last when they don't meet.
  const start = Math.max(1, Math.min(page - 1, pages - 2));
  const window = [start, start + 1, start + 2].filter((p) => p >= 1 && p <= pages);
  const items: (number | "…")[] = window.includes(pages) ? window : [...window, ...(window.at(-1)! < pages - 1 ? (["…"] as const) : []), pages];

  return (
    <nav aria-label="Pagination" className="flex items-center justify-center gap-2 text-[14px] leading-[1.4] font-medium text-ink">
      <button type="button" onClick={() => onChange(page - 1)} disabled={page === 1} className="flex items-center gap-1 font-normal text-ink-2 disabled:text-[#c3c3c3]">
        <Prev size={18} aria-hidden /> Previous
      </button>
      {items.map((p, i) =>
        p === "…" ? (
          <span key={`gap${i}`} className="px-1 text-ink-2">
            …
          </span>
        ) : (
          <button key={p} type="button" onClick={() => onChange(p)} aria-current={p === page ? "page" : undefined} className={`rounded-md px-2.5 py-1.5 ${p === page ? "bg-primary text-white" : "hover:bg-surface-alt"}`}>
            {p}
          </button>
        ),
      )}
      <button type="button" onClick={() => onChange(page + 1)} disabled={page === pages} className="flex items-center gap-1 font-normal text-ink-2 disabled:text-[#c3c3c3]">
        Next <Next size={18} aria-hidden />
      </button>
    </nav>
  );
}

/* ---------------------------------------------------------------- modal --- */

/**
 * The last few elements that had the focus, newest last: an opening Modal keeps them, as where to hand
 * the focus back when it closes. The opener itself may be gone by then — a menu item, whose menu closed
 * as it opened the dialog — so the focus goes to the latest one still on the page, the menu's button.
 */
const focusTrail: HTMLElement[] = [];
let trailing = false;
function trackFocus() {
  if (trailing) return;
  trailing = true;
  document.addEventListener("focusin", (e) => {
    if (!(e.target instanceof HTMLElement)) return;
    focusTrail.push(e.target);
    if (focusTrail.length > 8) focusTrail.shift();
  });
}

const FOCUSABLE = 'a[href], button, input:not([type="hidden"]), select, textarea, summary, iframe, audio[controls], video[controls], [tabindex], [contenteditable="true"]';

/**
 * What Tab stops on inside `box`, in order: enabled and on screen, and not an item a roving group
 * (tabs, a toggle group) holds at tabindex -1. A video's controls count though its tabIndex may not say.
 */
const tabStops = (box: HTMLElement) =>
  [...box.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => !el.matches(":disabled") && (el.tabIndex >= 0 || (el.matches("audio, video") && !el.hasAttribute("tabindex"))) && el.getClientRects().length > 0);

/** Tab and Shift+Tab go round the dialog's own controls instead of out to the page behind it. */
function keepTabInside(e: KeyboardEvent<HTMLDivElement>) {
  if (e.key !== "Tab" || e.defaultPrevented) return;
  const box = e.currentTarget;
  const stops = tabStops(box);
  const first = stops[0];
  const last = stops.at(-1);
  if (!first || !last) return e.preventDefault();
  const at = document.activeElement;
  if (e.shiftKey ? at === first || at === box : at === last) {
    e.preventDefault();
    (e.shiftKey ? last : first).focus();
  }
}

/** The dialogs open now, in the order they opened: the last is the one on top. */
const openDialogs: symbol[] = [];

/**
 * Escape closes the dialog while it's open — only the top one, with one open over another — unless a
 * popup inside it claimed the key first.
 */
function useCloseOnEscape(open: boolean, onClose: () => void) {
  const close = useEffectEvent(onClose);
  useEffect(() => {
    if (!open) return;
    const me = Symbol("dialog");
    openDialogs.push(me);
    // A popup inside the dialog (a Select menu, the date picker) claims Escape with preventDefault;
    // it closes that popup, not the whole dialog. Every open dialog listens, so the top one claims
    // the key as it closes: one Escape used to close the whole stack.
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented || openDialogs.at(-1) !== me) return;
      e.preventDefault();
      close();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      openDialogs.splice(openDialogs.indexOf(me), 1);
    };
  }, [open]);
}

/**
 * The way back of a dialog that has just closed, for one opening in its place in the same update:
 * Review proposal gives way to Decline, and Decline back to the review. Each takes the first one's way
 * back rather than the trail's, which by then holds only the dialogs' own controls — a long enough
 * round trip had pushed the opener off it, and closing the review left the focus on <body>.
 */
let handedOver: HTMLElement[] | null = null;

/**
 * Where the focus can go back to when the dialog in `box` closes, best last. What has the focus as it
 * opens, if that's outside it, is its opener: last, after the trail. With the focus on <body> (the
 * dialog this one replaces took it along) or already inside it (autoFocus), it's the way back of a
 * dialog that has just closed in its place, or else the trail. Opened from inside another dialog, it
 * goes back there.
 */
function wayBack(box: HTMLElement) {
  const at = document.activeElement;
  const opener = at instanceof HTMLElement && at !== document.body && !box.contains(at) ? at : null;
  if (!opener && handedOver) return handedOver;
  const trail = focusTrail.filter((el) => !box.contains(el) && el !== opener);
  return opener ? [...trail, opener] : trail;
}

/**
 * The focus while the dialog is open: it moves in on opening, and on closing goes back to what opened
 * it, or else the latest element before that which is still on the page. Returns the ref for the
 * dialog's panel.
 */
function useFocusInside(open: boolean, mounted: boolean) {
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const box = panel.current;
    if (!open || !mounted || !box) return;
    // Kept as it opens: tabbing round the dialog moves the trail on.
    const back = wayBack(box);
    // Opening takes the focus into the dialog, unless a field inside already has it (autoFocus).
    if (!box.contains(document.activeElement)) box.focus({ preventScroll: true });
    return () => {
      // For a dialog that opens in this one's place, in this same update.
      handedOver = back;
      // Closing drops the focus on <body> with the dialog: hand it back to the page. Checked a tick
      // later, so Strict Mode's rehearsal unmount (the dialog stays, and keeps the focus) and a dialog
      // opening in this one's place (it has the focus by then) leave it where it is.
      queueMicrotask(() => {
        handedOver = null;
        if (document.activeElement && document.activeElement !== document.body) return;
        back.findLast((el) => el.isConnected && el !== document.body)?.focus({ preventScroll: true });
      });
    };
  }, [open, mounted]);
  return panel;
}

/** A dialog: its title (always its accessible name) and description, its content and footer, and its look. */
type ModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  tone?: "default" | "danger";
  width?: number;
  /** A × in the title row. Danger dialogs always have one; others opt in. */
  closeButton?: boolean;
  /** Hand the whole panel to `children`: no padding, no title row, no footer row. For designs
   * that own their chrome — a header bar, panes that reach the edges, a footer of their own. */
  bare?: boolean;
};

export function Modal({ open, onClose, title, description, children, footer, tone = "default", width = 512, bare = false, closeButton = false }: ModalProps) {
  const id = useId();
  const X = ICONS.close;
  const mounted = useSyncExternalStore(NOOP_SUBSCRIBE, CLIENT_MOUNTED, SERVER_MOUNTED);
  useEffect(trackFocus, []);
  useCloseOnEscape(open, onClose);
  const panel = useFocusInside(open, mounted);
  if (!open || !mounted || typeof document === "undefined") return null;
  // Portalled to <body>: page content sits inside ScrollFade's `isolate`, which would otherwise
  // trap this overlay in a stacking context that the shell's sidebar paints over.
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/25 p-4" onClick={onClose}>
      {/* Not a native <dialog>: showModal() makes everything outside it inert, and the Select menus
          and date pickers inside portal to <body>. The focus is kept inside by hand instead. */}
      {/* react-doctor-disable-next-line react-doctor/prefer-html-dialog */}
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={id}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={keepTabInside}
        className={`ui-zoom relative flex max-h-[calc(90vh/var(--ui-scale))] w-full flex-col rounded-xl bg-white outline-none ${bare ? "overflow-hidden" : "gap-5 overflow-y-auto p-6"}`}
        style={{ maxWidth: width }}
      >
        {bare ? (
          <>
            <h2 id={id} className="sr-only">
              {title}
            </h2>
            {children}
          </>
        ) : (
          <>
            <div className="flex items-start gap-3">
              <ModalHeading id={id} title={title} description={description} danger={tone === "danger"} />
              {(tone === "danger" || closeButton) && (
                <button type="button" onClick={onClose} aria-label="Close" className={`${ICON_BUTTON} -m-1.5 size-8`}>
                  <X size={16} aria-hidden />
                </button>
              )}
            </div>
            {children}
            {footer && <div className="flex justify-end gap-3">{footer}</div>}
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}

/** The title row's words: a warning mark on a danger dialog, then the title — the dialog's name, `id` — and its description. */
function ModalHeading({ id, title, description, danger }: { id: string; title: string; description?: ReactNode; danger: boolean }) {
  const W = ICONS.warning;
  return (
    <>
      {danger && (
        <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-[#fcf2f2] text-danger">
          <W size={14} aria-hidden />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <h2 id={id} className="text-[20px] leading-[1.4] font-semibold text-ink">
          {title}
        </h2>
        {description && <p className="mt-1.5 text-[14px] leading-[1.4] text-ink-2">{description}</p>}
      </div>
    </>
  );
}

/* --------------------------------------------------------------- drawer --- */

/**
 * A drawer (800 wide, right-anchored) on shadcn's Sheet, so it slides in and out — it used to
 * mount and unmount in a single frame. A title row with the close, then a scrolling body. The Sheet
 * portals, traps focus and closes on Escape or a click outside.
 *
 * `header` swaps the visible title for other content in that row (the title stays the dialog's
 * accessible name), `actions` sit beside the close, and `footer` pins below the body — the task
 * panel uses all three. A `header` may run to several lines (an eyebrow such as "#4", a name that
 * wraps), so its row aligns to the top, with the actions and the close centred on its first 20px
 * line, and a hairline under it: the body scrolls beneath it.
 *
 * Opening moves the focus to the first control inside, unless one was already focused (autoFocus).
 * `initialFocus="close"` starts on the close button instead — for a header whose first control is a
 * field, which shouldn't look mid-edit every time the sheet opens. A ref starts on its control, or on
 * the close button when that control isn't there — the task sheet, opened to set dates, starts on the
 * first date this person can change.
 */
export function Drawer({
  open,
  onClose,
  title,
  children,
  width = 800,
  header,
  actions,
  footer,
  testId,
  initialFocus = "first",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  width?: number;
  header?: ReactNode;
  actions?: ReactNode;
  footer?: ReactNode;
  testId?: string;
  initialFocus?: "first" | "close" | RefObject<HTMLElement | null>;
}) {
  const Close = ICONS.close;
  const closeRef = useRef<HTMLButtonElement>(null);
  const start = initialFocus === "first" ? true : initialFocus === "close" ? closeRef : () => initialFocus.current ?? closeRef.current;
  return (
    <Sheet open={open} onOpenChange={(next) => !next && onClose()}>
      <SheetContent side="right" showCloseButton={false} initialFocus={start} className="gap-0 data-[side=right]:w-full" style={{ maxWidth: width }} data-testid={testId}>
        <SheetHeader className={`flex-row justify-between gap-3 px-6 py-5 ${header ? "items-start border-b border-border" : "items-center"}`}>
          {header ? (
            <>
              <SheetTitle className="sr-only">{title}</SheetTitle>
              <div className="flex min-w-0 flex-1 items-center gap-2">{header}</div>
            </>
          ) : (
            <SheetTitle className="font-sans text-[18px] leading-[1.4] font-semibold text-ink">{title}</SheetTitle>
          )}
          <div className={`flex shrink-0 items-center gap-1 ${header ? "h-5" : ""}`}>
            {actions}
            {/* The negative margin gives the icon a hover box without making the row taller. */}
            <SheetClose ref={closeRef} aria-label="Close" className={`${ICON_BUTTON} -m-1.5 size-8`}>
              <Close size={20} aria-hidden />
            </SheetClose>
          </div>
        </SheetHeader>
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-6">{children}</div>
        {footer && <div className="shrink-0 border-t border-border px-6 py-4">{footer}</div>}
      </SheetContent>
    </Sheet>
  );
}

/* ---------------------------------------------------------------- toast --- */

const TOAST_TONE = {
  success: { bg: "bg-[#e4f5ea]", icon: ICONS.checkCircle, ink: "text-ok" },
  danger: { bg: "bg-[#fcf2f2]", icon: ICONS.warning, ink: "text-danger" },
  info: { bg: "bg-[#ebf8fe]", icon: ICONS.info, ink: "text-primary" },
} as const;

/**
 * A page's toast (`useToast` in @/lib/portal/toast), in the corner. A `danger` one explains something
 * that was refused or didn't work and is announced at once (role="alert"); `action` offers the one
 * thing to do about it — Undo, Retry, Use mine — and keeps the toast up longer so there's time to
 * click it. While the pointer is on it or it has focus, the countdown waits (WCAG 2.2.1): reaching
 * for Undo never loses it.
 */
export function Toast({ toast, onClose, action }: { toast: PageToast | null; onClose: () => void; action?: { label: string; onClick: () => void } }) {
  const tone = toast?.tone ?? "success";
  const t = TOAST_TONE[tone];
  const X = ICONS.close;
  const lasts = action || tone === "danger" ? 8000 : 3500;
  /** Held while it's hovered or focused; the countdown starts again from the top once it's let go. */
  const [held, setHeld] = useState(false);
  const mounted = useSyncExternalStore(NOOP_SUBSCRIBE, CLIENT_MOUNTED, SERVER_MOUNTED);
  useEffect(() => {
    if (!toast || held) return;
    const timer = setTimeout(onClose, lasts);
    return () => clearTimeout(timer);
  }, [toast, onClose, lasts, held]);
  if (!toast || !mounted) return null;
  return createPortal(
    // aria-live spelled out, not just implied by the role: a modal (an item's sheet, say) hides
    // the rest of the page from screen readers, except live regions it can find by that attribute.
    <div onPointerEnter={() => setHeld(true)} onPointerLeave={() => setHeld(false)} onFocus={() => setHeld(true)} onBlur={() => setHeld(false)} role={tone === "danger" ? "alert" : "status"} aria-live={tone === "danger" ? "assertive" : "polite"} className={`ui-zoom fixed top-5 right-5 z-[70] flex max-w-[min(480px,calc(100vw-40px))] items-center gap-3 rounded-lg ${t.bg} px-4 py-3 text-[14px] leading-[1.4] text-ink shadow-[0_8px_24px_rgba(0,0,0,.12)]`}>
      <t.icon size={20} aria-hidden className={`shrink-0 ${t.ink}`} />
      <span className="min-w-0">{toast.message}</span>
      {action && (
        <button
          type="button"
          onClick={() => {
            action.onClick();
            onClose();
          }}
          className="shrink-0 rounded-md px-2 py-1 text-[14px] font-semibold text-primary hover:bg-white/70 focus-visible:outline-2 focus-visible:outline-primary"
        >
          {action.label}
        </button>
      )}
      <button type="button" onClick={onClose} aria-label="Dismiss" className={`${ICON_BUTTON} -my-1 -mr-1.5 ml-0.5 size-7`}>
        <X size={16} aria-hidden />
      </button>
    </div>,
    document.body,
  );
}

/* ------------------------------------------------------------- stepper ---- */

export function Steps({ steps, current }: { steps: string[]; current: number }) {
  return (
    <ol className="relative flex h-14 w-full items-start">
      {steps.map((s, i) => {
        // Stepper colours — done blue, current grey, upcoming an empty ring — as solid discs. A ring
        // with a dot inside read as half-filled, and its inner gap never looked even.
        const done = i < current;
        return (
          <li key={s} aria-current={i === current ? "step" : undefined} className="relative flex h-14 min-w-0 flex-1 flex-col items-center gap-2">
            {/* 4px tall at top 14px: centred on the 32px disc. */}
            {i < steps.length - 1 && <span aria-hidden className="pointer-events-none absolute top-[14px] left-1/2 h-1 w-full bg-border" />}
            <span className={`relative z-10 size-8 rounded-full ${done ? "bg-primary" : i === current ? "bg-border" : "border-2 border-border bg-white"}`} />
            <span className={`relative z-10 h-4 text-center text-[12px] leading-[1.2] tracking-[0.2px] whitespace-nowrap ${done ? "text-ink" : "text-ink-2"}`}>{s}</span>
          </li>
        );
      })}
    </ol>
  );
}

/* ------------------------------------------------------ pipeline tracker --- */

type MajorStage = "applied" | "matched" | "interviewed" | "proposal_sent" | "offer_accepted" | "hired";

const MILESTONE_COLORS: Record<MajorStage, string> = {
  applied: "bg-ink-2",
  matched: "bg-primary",
  interviewed: "bg-brand-orange",
  proposal_sent: "bg-[#6e0e52]",
  offer_accepted: "bg-[#f2c94c]",
  hired: "bg-ok",
};

function milestoneColor(key: string) {
  return MILESTONE_COLORS[key as MajorStage];
}

/**
 * The tracker's rows as they sit on the rail, top-down: each stage with `i`, its place in PIPELINE,
 * and its top, centre (`cy`) and height; the rail's full height; and the majors among the rows. It's
 * the same whatever the stage, so it's laid out once.
 */
function layRail() {
  // Lay the reversed list out top-down and remember each row's centre y on the rail.
  const rows = [...PIPELINE].reverse();
  let y = 0;
  const laid = rows.map((p, r) => {
    const prev = rows[r - 1];
    if (r > 0) y += prev && !prev.major && !p.major ? 12 : 16;
    const h = p.major ? 16 : 12;
    const row = { ...p, i: PIPELINE.length - 1 - r, top: y, cy: y + h / 2, h };
    y += h;
    return row;
  });
  return { laid, height: y, majors: laid.filter((p) => p.major) };
}

const RAIL = layRail();

/** How far along the rail `stage` is: its index, the latest major reached, and the top reached sub-status above it. */
function railProgress(stage: Stage) {
  const idx = PIPELINE.findIndex((p) => p.key === stage);
  const currentMajor = [...PIPELINE]
    .slice(0, idx + 1)
    .reverse()
    .find((p) => p.major)?.key;
  const topReachedSub = RAIL.laid.find((p) => !p.major && p.i <= idx && p.i > (PIPELINE.findIndex((q) => q.key === currentMajor) ?? -1));
  const cur = RAIL.majors.find((m) => m.key === currentMajor);
  return { idx, currentMajor, topReachedSub, cur };
}

/**
 * Pipeline tracker: a rail beside a label column. Rail colours: past majors #616161, current
 * #007acc, connector below current #007acc, reached sub-statuses above the current major #ff8112,
 * everything else #f2f2f2. Milestone mode uses green, yellow, purple, orange, blue, then gray.
 */
export function PipelineTracker({ stage, labels = {}, mode = "progress" }: { stage: Stage; labels?: Partial<Record<Stage, string>>; mode?: "progress" | "milestone" }) {
  const progress = railProgress(stage);
  const { idx } = progress;
  return (
    <Card className="flex flex-col gap-6 p-4">
      <CardTitle className="text-ink-deep">Pipeline tracker</CardTitle>
      <div className="flex items-center gap-6 px-2 pb-2">
        <PipelineRail progress={progress} milestoneMode={mode === "milestone"} />
        <ol className="relative shrink-0" style={{ height: RAIL.height }}>
          {RAIL.laid.map((p) => (
            <li
              key={p.key}
              className={`absolute flex items-center leading-[1.2] tracking-[0.2px] whitespace-nowrap ${p.major ? "text-[12px] font-semibold" : "pl-3 text-[10px]"} ${
                p.i <= idx ? (p.major ? "text-ink" : "text-ink-2") : "text-[#c3c3c3]"
              }`}
              style={{ top: p.top, height: p.h }}
            >
              {labels[p.key] ?? p.label}
            </li>
          ))}
        </ol>
      </div>
    </Card>
  );
}

/** The rail beside the labels: the connectors between majors, the orange run of reached sub-statuses, and a dot on each major. */
function PipelineRail({ progress, milestoneMode }: { progress: ReturnType<typeof railProgress>; milestoneMode: boolean }) {
  const { idx, currentMajor, topReachedSub, cur } = progress;
  const { majors } = RAIL;
  return (
    <span aria-hidden className="relative w-4 shrink-0" style={{ height: RAIL.height }}>
      {majors.map((m, k) => {
        const next = majors[k + 1];
        if (!next) return null;
        const reached = m.i <= idx; // upper major reached → the whole connector is done
        const color = milestoneMode ? (reached ? milestoneColor(m.key) : "bg-surface-2") : reached ? "bg-primary" : "bg-surface-2";
        return <span key={m.key} className={`absolute left-1.5 w-1 ${color}`} style={{ top: m.cy, height: next.cy - m.cy }} />;
      })}
      {!milestoneMode && cur && topReachedSub && (
        <span
          className="absolute left-1.5 w-1 bg-brand-orange"
          style={{
            top: topReachedSub.cy,
            height: cur.cy - topReachedSub.cy,
          }}
        />
      )}
      {majors.map((m) => (
        <span
          key={m.key}
          className={`absolute left-0 size-4 rounded-full ${milestoneMode ? (m.i <= idx ? milestoneColor(m.key) : "bg-surface-2") : m.key === currentMajor ? "bg-primary" : m.i <= idx ? "bg-ink-2" : "bg-surface-2"}`}
          style={{ top: m.cy - 8 }}
        />
      ))}
    </span>
  );
}

/* Work style is the talent's Workplace Tags (TraitTag), not a chart of its own. */
