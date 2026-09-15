"use client";

import Link from "next/link";
import { useEffect, useId, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { ICONS, type IconName } from "@/components/admin/icons";
import { ScrollFade } from "@/components/portal/ScrollFade";

/* ---------------------------------------------------------------- page ---- */

/** Figma "Header": p 16, Inter 16 SemiBold, bottom stroke #c3c3c3. Optional close (wizard/offer screens). */
export function Page({
  title,
  onClose,
  tabs,
  badge,
  children,
  padded = true,
  heading = "display",
}: {
  title: ReactNode;
  onClose?: () => void;
  tabs?: ReactNode;
  badge?: ReactNode;
  children: ReactNode;
  padded?: boolean;
  /** One header strip for every page: 24 DM Sans by default; "modal" is the 20 Inter close-button variant (offer / edit screens). */
  heading?: "default" | "modal" | "display";
}) {
  const Close = ICONS.close;
  return (
    <>
      <header className="shrink-0 shadow-[inset_0_-1px_0_#c3c3c3]">
        {/* One 56px title row for every heading size, so the title sits at the same spot on every page; tabs hang below it. */}
        <div className="flex h-14 items-center justify-between gap-3 px-4">
          <h1
            className={`flex items-center gap-2 text-ink ${
              heading === "display"
                ? "font-display text-[24px] leading-[1.5] font-semibold tracking-[0.2px]"
                : heading === "modal"
                  ? "text-[20px] leading-[1.5] font-semibold tracking-[0.4px]"
                  : "text-[16px] leading-[1.5] font-semibold tracking-[0.2px]"
            }`}
            style={heading === "display" ? { fontVariationSettings: '"opsz" 14' } : undefined}
          >
            {title}
            {badge}
          </h1>
          {onClose && (
            <button type="button" onClick={onClose} aria-label="Close" className="text-ink">
              <Close size={24} aria-hidden />
            </button>
          )}
        </div>
        {tabs && <div className="pb-1">{tabs}</div>}
      </header>
      {/* The gutter is on this wrapper, not the scroller, so nothing scrolls through it; ScrollFade
          hugs the scroller so its ramps land on the scrollport edges. The width cap goes on the inner
          column, matching AdminPage. `padded={false}` pages set their own (wizards, the kanban). */}
      <div className={`flex min-h-0 flex-1 ${padded ? "p-2" : ""}`}>
        <ScrollFade className="flex w-full min-w-0">
          <div className="w-full overflow-y-auto">
            {padded ? <div className="mx-auto flex min-h-full w-full max-w-[1440px] flex-col gap-6">{children}</div> : children}
          </div>
        </ScrollFade>
      </div>
    </>
  );
}

export function Breadcrumb({ items }: { items: (string | { label: string; href: string })[] }) {
  return (
    <p className="text-[13px] leading-[1.4] whitespace-pre text-ink-2">
      {items.map((it, i) => (
        <span key={i}>
          {i > 0 && "   ›   "}
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

export function BackLink({ href, children }: { href: string; children: ReactNode }) {
  const L = ICONS.chevronLeft;
  return (
    <Link href={href} className="inline-flex items-center gap-1.5 text-[13px] leading-[1.4] font-medium text-ink-2 hover:text-accent">
      <L size={18} aria-hidden /> {children}
    </Link>
  );
}

/* ------------------------------------------------------------- buttons ---- */

type Variant = "primary" | "secondary" | "danger" | "ghost" | "dark";

const BTN: Record<Variant, string> = {
  primary: "bg-primary text-white hover:brightness-110 disabled:bg-[#e5e5e5] disabled:text-[#c3c3c3]",
  secondary: "border border-border bg-white text-ink hover:bg-surface-alt disabled:border-transparent disabled:bg-[#e5e5e5] disabled:text-[#c3c3c3]",
  danger: "bg-danger text-white hover:brightness-110",
  ghost: "text-ink hover:bg-surface-alt",
  dark: "bg-ink text-white",
};

/**
 * Figma "Buttons": 36 / 40 / 44 / 48 tall, Inter Medium 12 / 14 / 14 / 16.
 * `xs` is the pill from Hireable — Draft 11321:3070 ("Join"): p 8, gap 4, Inter Regular 10, r 100.
 * Radius, weight and gap live here rather than on the shared base so `xs` can differ without
 * `!important` — Tailwind can't resolve two same-property utilities by class order.
 */
const BTN_SIZE = {
  xs: "h-7 gap-1 rounded-full px-2 text-[10px] font-normal",
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
  type = "button",
  className = "",
}: {
  children: ReactNode;
  variant?: Variant;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit";
  className?: string;
}) {
  const sz = BTN_SIZE[size];
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center whitespace-nowrap transition disabled:cursor-not-allowed ${sz} ${BTN[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

export function LinkButton({
  href,
  children,
  variant = "secondary",
  size = "md",
  className = "",
}: {
  href: string;
  children: ReactNode;
  variant?: Variant;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
}) {
  const sz = BTN_SIZE[size];
  return (
    <Link href={href} className={`inline-flex items-center justify-center whitespace-nowrap transition ${sz} ${BTN[variant]} ${className}`}>
      {children}
    </Link>
  );
}

export function IconButton({ icon, label, onClick, active, size = 16, className = "" }: { icon: IconName; label: string; onClick?: () => void; active?: boolean; size?: number; className?: string }) {
  const I = ICONS[icon];
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      className={`inline-flex size-8 items-center justify-center rounded-lg border border-border bg-white text-ink-2 hover:bg-surface-alt ${active ? "border-primary text-primary" : ""} ${className}`}
    >
      <I size={size} aria-hidden />
    </button>
  );
}

/* -------------------------------------------------------------- surfaces -- */

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-lg bg-white outline -outline-offset-1 outline-border ${className}`}>{children}</section>;
}

export function CardTitle({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <h2 className={`text-[16px] leading-[1.5] font-semibold tracking-[0.2px] text-ink ${className}`}>{children}</h2>;
}

export function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Card className="flex min-w-0 flex-1 flex-col gap-1 p-4 whitespace-nowrap">
      <p className="text-[13px] leading-[1.4] font-medium text-ink-2">{label}</p>
      <p className="font-display text-[24px] leading-[1.5] font-semibold text-ink" style={{ fontVariationSettings: '"opsz" 14' }}>
        {value}
      </p>
      {sub && <p className="text-[13px] leading-[1.4] text-ink-2">{sub}</p>}
    </Card>
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

export function InfoBanner({ children, tone = "info" }: { children: ReactNode; tone?: "info" | "warn" }) {
  const I = tone === "info" ? ICONS.info : ICONS.warning;
  return (
    <div className={`flex items-start gap-4 rounded-lg p-4 text-[14px] leading-[1.2] tracking-[0.2px] ${tone === "info" ? "bg-[#ccedff] text-[#003049]" : "bg-[#fff3cc] text-[#8e6f12]"}`}>
      <I size={20} aria-hidden className="shrink-0" />
      <span>{children}</span>
    </div>
  );
}

/* --------------------------------------------------------------- badges --- */

export function JobBadge({ type }: { type: "trial" | "full-time" }) {
  return (
    <span
      className={`inline-flex h-6 items-center rounded px-2 text-[12px] leading-[1.2] tracking-[0.2px] whitespace-nowrap uppercase ${
        type === "trial" ? "bg-[#fff5ec] text-brand-orange" : "bg-[#ebf8fe] text-primary"
      }`}
    >
      {type}
    </span>
  );
}

export function MatchPill({ pct }: { pct: number }) {
  // Figma "Match pill": one gradient for every score; 0 = grey placeholder
  return (
    <span
      className={`inline-flex h-6 items-center rounded px-2 text-[12px] leading-[1.2] font-medium tracking-[0.2px] whitespace-nowrap ${pct ? "text-white" : "bg-[#e5e5e5] text-[#c3c3c3]"}`}
      style={
        pct
          ? {
              backgroundImage: "linear-gradient(101.96deg, #afd845 0%, #27ae60 60.58%, #098be2 121.16%)",
            }
          : undefined
      }
    >
      {pct}% match
    </span>
  );
}

export type Tone = "ok" | "warn" | "danger" | "info" | "neutral" | "trial";
const DOT: Record<Tone, string> = {
  ok: "bg-[#eef9f2] text-ok",
  warn: "bg-warn-bg text-warn",
  danger: "bg-[#fcf2f2] text-danger",
  info: "bg-[#ebf8fe] text-[#00a7f8]",
  neutral: "bg-surface-2 text-ink-2",
  trial: "bg-[#fff5ec] text-brand-orange",
};

export function StatusDot({ tone, children }: { tone: Tone; children: ReactNode }) {
  return (
    <span className={`inline-flex h-6 items-center gap-1 rounded px-2 text-[12px] leading-[1.2] font-medium tracking-[0.2px] whitespace-nowrap ${DOT[tone]}`}>
      <span aria-hidden className="size-1.5 rounded-full bg-current opacity-76" />
      {children}
    </span>
  );
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

/* ------------------------------------------------------------- controls --- */

export function Field({ label, hint, children, className = "" }: { label: ReactNode; hint?: string; children: ReactNode; className?: string }) {
  return (
    <label className={`flex flex-col gap-2 ${className}`}>
      <span className="text-[14px] leading-[1.2] font-semibold tracking-[0.2px] text-ink">{label}</span>
      {children}
      {hint && <span className="text-[14px] leading-[1.2] tracking-[0.2px] text-ink-2">{hint}</span>}
    </label>
  );
}

const INPUT =
  "h-11 w-full rounded-lg border border-border bg-white px-4 text-[14px] leading-[1.2] tracking-[0.2px] text-ink outline-none placeholder:text-ink-2 focus:border-primary disabled:bg-surface-2";

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${INPUT} ${props.className ?? ""}`} />;
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${INPUT} h-auto min-h-16 py-[13.5px] ${props.className ?? ""}`} />;
}

export function Select({ options, ...props }: React.SelectHTMLAttributes<HTMLSelectElement> & { options: string[] }) {
  const C = ICONS.chevron;
  return (
    <span className="relative block">
      <select {...props} className={`${INPUT} appearance-none pr-11 ${props.className ?? ""}`}>
        {options.map((o) => (
          <option key={o}>{o}</option>
        ))}
      </select>
      <C size={24} aria-hidden className="pointer-events-none absolute top-2.5 right-4 text-ink" />
    </span>
  );
}

export function SearchBox({ value, onChange, placeholder, className = "" }: { value: string; onChange: (v: string) => void; placeholder: string; className?: string }) {
  const S = ICONS.search;
  return (
    <label className={`flex h-11 items-center gap-2 rounded-lg border border-border bg-white px-4 text-ink-2 ${className}`}>
      <S size={16} aria-hidden />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="min-w-0 flex-1 bg-transparent text-[14px] leading-[1.2] tracking-[0.2px] text-ink outline-none placeholder:text-ink-2"
      />
    </label>
  );
}

export function Checkbox({ checked, onChange, children, disabled }: { checked: boolean; onChange?: (v: boolean) => void; children?: ReactNode; disabled?: boolean }) {
  const C = ICONS.check;
  return (
    <label className={`inline-flex items-center gap-2.5 text-[14px] leading-[1.4] text-ink ${disabled ? "opacity-50" : "cursor-pointer"}`}>
      <input type="checkbox" checked={checked} disabled={disabled} onChange={(e) => onChange?.(e.target.checked)} className="peer sr-only" />
      <span
        className={`flex size-4 items-center justify-center rounded-[3.2px] ${
          checked ? "bg-primary text-white" : "border-[0.8px] border-border bg-white"
        } peer-focus-visible:ring-2 peer-focus-visible:ring-primary/30`}
        aria-hidden
      >
        {checked && <C size={13} />}
      </span>
      {children}
    </label>
  );
}

/** Rounded pill tabs — Figma "Upcoming (2) / Past (3)", "All / Unread / …" */
export function Pills<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          aria-pressed={o.value === value}
          className={`rounded-full px-3 py-1.5 text-[13px] leading-[1.4] font-medium transition ${o.value === value ? "bg-ink text-white" : "bg-surface-2 text-ink hover:bg-[#e5e5e5]"}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Underlined tabs — "Dashboard | Evaluation", "Conversations | Applications" */
export function Tabs<T extends string>({ value, onChange, options, className = "" }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[]; className?: string }) {
  return (
    <div className={`flex gap-6 ${className}`}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          aria-selected={o.value === value}
          className={`flex h-9 items-center border-b-2 py-2 text-[14px] leading-[1.2] font-semibold tracking-[0.2px] ${
            o.value === value ? "border-[#00a7f8] text-ink" : "border-transparent text-ink-2 hover:text-ink"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Progress({ value, tone = "primary", label, className = "w-[220px]" }: { value: number; tone?: "primary" | "ok" | "warn" | "danger" | "muted"; label?: boolean; className?: string }) {
  const c = {
    primary: "bg-primary",
    ok: "bg-ok",
    warn: "bg-brand-orange",
    danger: "bg-danger",
    muted: "bg-border",
  }[tone];
  return (
    <span className={`inline-flex h-[18px] items-center gap-1 ${className}`}>
      <span className="block h-2.5 min-w-0 flex-1 overflow-hidden rounded-full bg-surface-2" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}>
        <span className={`block h-full rounded-full ${c}`} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
      </span>
      {label && <span className="w-10 text-center text-[14px] leading-[1.2] tracking-[0.2px] text-ink">{value}%</span>}
    </span>
  );
}

/* ---------------------------------------------------------------- modal --- */

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  tone = "default",
  width = 512,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  tone?: "default" | "danger";
  width?: number;
}) {
  const id = useId();
  const X = ICONS.close;
  const W = ICONS.warning;
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  // Portalled to <body>: page content sits inside ScrollFade's `isolate`, which would otherwise
  // trap this overlay in a stacking context that the shell's sidebar paints over.
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/25 p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={id}
        onClick={(e) => e.stopPropagation()}
        className="relative flex max-h-[90vh] w-full flex-col gap-5 overflow-y-auto rounded-xl bg-white p-6"
        style={{ maxWidth: width }}
      >
        <div className="flex items-start gap-3">
          {tone === "danger" && (
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
          {tone === "danger" && (
            <button type="button" onClick={onClose} aria-label="Close" className="text-ink-2">
              <X size={16} aria-hidden />
            </button>
          )}
        </div>
        {children}
        {footer && <div className="flex justify-end gap-3">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

/* ---------------------------------------------------------------- toast --- */

export function Toast({ message, onClose }: { message: string | null; onClose: () => void }) {
  const C = ICONS.checkCircle;
  const X = ICONS.close;
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [message, onClose]);
  if (!message) return null;
  return createPortal(
    <div role="status" className="fixed top-5 right-5 z-50 flex items-center gap-3 rounded-lg bg-[#e4f5ea] px-4 py-3 text-[14px] text-ink shadow-[0_8px_24px_rgba(0,0,0,.12)]">
      <C size={20} aria-hidden className="text-ok" />
      {message}
      <button type="button" onClick={onClose} aria-label="Dismiss" className="ml-2 text-ink-2">
        <X size={16} aria-hidden />
      </button>
    </div>,
    document.body,
  );
}

/** One-liner for pages: `const [toast, setToast] = useToast();` */
export function useToast(): [string | null, (m: string | null) => void] {
  return useState<string | null>(null);
}

/* ------------------------------------------------------------ objectives --- */

const OBJ_STYLE = [
  { bg: "bg-[#ebf8fe]", fg: "text-primary", icon: "notes" as IconName },
  {
    bg: "bg-[#ffe5f6]",
    fg: "text-brand-magenta",
    icon: "marketing" as IconName,
  },
  { bg: "bg-[#ffe8d1]", fg: "text-brand-orange", icon: "target" as IconName },
];

export function ObjectiveRow({ index, children, right }: { index: number; children: ReactNode; right?: ReactNode }) {
  const s = OBJ_STYLE[index % 3];
  const I = ICONS[s.icon];
  return (
    <div className="flex items-center gap-2 rounded-lg bg-white p-3 outline -outline-offset-1 outline-border">
      <span className={`flex size-6 shrink-0 items-center justify-center rounded-[4.8px] ${s.bg} ${s.fg}`}>
        <I size={14} aria-hidden />
      </span>
      <span className="flex-1 text-[16px] leading-[1.5] tracking-[0.2px] text-ink">{children}</span>
      {right}
    </div>
  );
}

/* ------------------------------------------------------------- stepper ---- */

export function Steps({ steps, current }: { steps: string[]; current: number }) {
  return (
    <ol className="relative flex h-14 items-start justify-between">
      <span aria-hidden className="absolute top-[15px] right-0 left-0 h-1 bg-border" />
      {steps.map((s, i) => {
        // Figma "Header" stepper variants: done = blue ring + dot, current = grey ring + dot, upcoming = empty ring.
        const done = i < current;
        return (
          <li key={s} className="relative flex h-14 flex-col items-center gap-2 bg-white px-1">
            <span className={`flex size-8 items-center justify-center rounded-full border-2 bg-white ${done ? "border-primary" : "border-border"}`}>
              <span className={`size-5 rounded-full ${done ? "bg-primary" : i === current ? "bg-border" : "bg-transparent"}`} />
            </span>
            <span className={`h-4 text-[12px] leading-[1.2] tracking-[0.2px] whitespace-nowrap ${done ? "text-ink" : "text-ink-2"}`}>{s}</span>
          </li>
        );
      })}
    </ol>
  );
}

/* ------------------------------------------------------ pipeline tracker --- */

export const PIPELINE = [
  { key: "applied", label: "Applied", major: true },
  { key: "matched", label: "Matched", major: true },
  { key: "invited", label: "Interview invitation received", major: false },
  { key: "invite_accepted", label: "Invitation accepted", major: false },
  { key: "interviewed", label: "Interview completed", major: true },
  { key: "proposal_requested", label: "Proposal requested", major: false },
  { key: "proposal_sent", label: "Proposal sent", major: true },
  { key: "offer_received", label: "Offer received", major: false },
  { key: "offer_accepted", label: "Offer accepted", major: true },
  { key: "hired", label: "Hired", major: true },
] as const;
export type Stage = (typeof PIPELINE)[number]["key"];

/**
 * Figma "Pipeline Tracker": a 16px rail (8px circles, 4px connectors) beside a label column —
 * majors 12px semibold / 16 tall, sub-statuses 10px indented 12, gap 16 (12 inside a sub group).
 * Rail colours: past majors #616161, current #007acc, connector below current #007acc, reached
 * sub-statuses above the current major #ff8112, everything else #f2f2f2.
 */
export function PipelineTracker({ stage, labels = {} }: { stage: Stage; labels?: Partial<Record<Stage, string>> }) {
  const idx = PIPELINE.findIndex((p) => p.key === stage);
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
  const H = y;
  const majors = laid.filter((p) => p.major);
  const currentMajor = [...PIPELINE]
    .slice(0, idx + 1)
    .reverse()
    .find((p) => p.major)?.key;
  const topReachedSub = laid.find((p) => !p.major && p.i <= idx && p.i > (PIPELINE.findIndex((q) => q.key === currentMajor) ?? -1));
  const cur = majors.find((m) => m.key === currentMajor);

  return (
    <Card className="flex flex-col gap-6 p-4">
      <CardTitle className="text-ink-deep">Pipeline tracker</CardTitle>
      <div className="flex items-center gap-6 px-2 pb-2">
        <span aria-hidden className="relative w-4 shrink-0" style={{ height: H }}>
          {majors.map((m, k) => {
            const next = majors[k + 1];
            if (!next) return null;
            const reached = m.i <= idx; // upper major reached → the whole connector is done
            return <span key={m.key} className={`absolute left-1.5 w-1 ${reached ? "bg-primary" : "bg-surface-2"}`} style={{ top: m.cy, height: next.cy - m.cy }} />;
          })}
          {cur && topReachedSub && (
            <span
              className="absolute left-1.5 w-1 bg-brand-orange"
              style={{
                top: topReachedSub.cy,
                height: cur.cy - topReachedSub.cy,
              }}
            />
          )}
          {majors.map((m) => (
            <span key={m.key} className={`absolute left-0 size-4 rounded-full ${m.key === currentMajor ? "bg-primary" : m.i <= idx ? "bg-ink-2" : "bg-surface-2"}`} style={{ top: m.cy - 8 }} />
          ))}
        </span>
        <ol className="relative shrink-0" style={{ height: H }}>
          {laid.map((p) => (
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

/* ---------------------------------------------------------- work style ---- */

const TRAITS = ["Decision Making", "Adaptability", "Responsiveness", "Time Management", "Cooperativeness", "Communication"];

/**
 * Figma "Work style" card: six 80px columns of five 80px cells that overlap by 32px (48px pitch), a
 * #e5e5e5 grid (column rules + a rule through each cell's centre) and a 64px bubble per party centred
 * on that rule — Team Builder #22d3ee, Independent #fbbf24, both at 90% with multiply so overlaps read green.
 */
export function WorkStyleChart({ builder, independent, match }: { builder: number[]; independent: number[]; match: number }) {
  return (
    <Card className="flex flex-col gap-6 p-4">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-ink-deep">Work style</CardTitle>
          <MatchPill pct={match} />
        </div>
        <p className="text-[12px] leading-[1.2] tracking-[0.2px] text-ink-2">See How Your Work Style Aligns With Independent Contractors.</p>
      </div>
      <div className="flex items-center gap-4 text-[10px] leading-[1.2] tracking-[0.2px] text-ink-2">
        <span className="flex items-center gap-1">
          <span className="size-2.5 rounded-full bg-[#22d3ee]" /> Team Builder
        </span>
        <span className="flex items-center gap-1">
          <span className="size-2.5 rounded-full bg-[#fbbf24]" /> Independent contractor
        </span>
      </div>
      <div className="flex items-center">
        {TRAITS.map((t, col) => (
          <div key={t} className="flex w-20 flex-col">
            {[5, 4, 3, 2, 1].map((level, r) => (
              <div key={level} className={`relative flex size-20 items-center justify-center border-x border-[#e5e5e5] ${r < 4 ? "-mb-8" : ""}`}>
                <span aria-hidden className="absolute top-[39px] right-0 left-0 h-px bg-[#e5e5e5]" />
                {builder[col] === level && <Bubble color="#22d3ee" />}
                {independent[col] === level && <Bubble color="#fbbf24" />}
              </div>
            ))}
            <div className="flex h-14 items-start justify-center border-x border-[#e5e5e5] px-2 pt-3 pb-6 text-center">
              <span className="text-[8px] leading-[1.2] tracking-[0.2px] text-ink-2">{t}</span>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function Bubble({ color }: { color: string }) {
  return <span className="absolute size-16 rounded-full opacity-90 mix-blend-multiply" style={{ background: color }} aria-hidden />;
}
