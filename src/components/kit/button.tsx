"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { ICONS } from "@/components/icons";
import { layoutClasses } from "@/components/kit/styles";
import { Tip } from "@/components/kit/tip";

/** `danger` is the one destructive button — the standard solid red, white text — on the button that
 *  opens a confirm (Remove, Decline, Drop, End contract) and on the confirm itself. There was a red
 *  outline variant for the first; the user wanted the plain standard red everywhere instead. */
type Variant = "primary" | "secondary" | "danger" | "ghost" | "dark";

const BTN: Record<Variant, string> = {
  primary: "bg-primary text-white hover:brightness-110 disabled:bg-surface-3 disabled:text-ink-disabled",
  secondary: "border border-border bg-white text-ink hover:bg-surface-alt disabled:border-transparent disabled:bg-surface-3 disabled:text-ink-disabled",
  // Disabled reads grey like every other disabled button, not a faded red.
  danger: "bg-danger text-white hover:bg-danger-hover disabled:bg-surface-3 disabled:text-ink-disabled",
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

/**
 * Every "Message …" action: the conversation icon plus the label, never a bare text button. With
 * `onClick` it opens the thread on the spot (a work screen's quick chat) instead of going to Messages.
 */
export function MessageButton({ href, onClick, children = "Message", size = "md", variant = "secondary", className = "" }: { href: string; onClick?: () => void; children?: ReactNode; size?: "sm" | "md" | "lg" | "xl"; variant?: "secondary" | "ghost"; className?: string }) {
  const Chat = ICONS.messages;
  const label = (
    <>
      <Chat size={size === "sm" ? 16 : 18} aria-hidden />
      {children}
    </>
  );
  if (onClick)
    return (
      <Button size={size} variant={variant} onClick={onClick} className={className}>
        {label}
      </Button>
    );
  return (
    <LinkButton href={href} size={size} variant={variant} className={className}>
      {label}
    </LinkButton>
  );
}
