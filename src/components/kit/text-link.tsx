"use client";

import Link from "next/link";
import type { ReactNode } from "react";

const LINK_TONE = { primary: "text-primary", danger: "text-danger", inherit: "" };

const LINK_SIZE = { sm: "text-[13px] leading-[1.4]", md: "text-[14px] leading-[1.4]" };

type TextLinkProps = {
  children: ReactNode;
  /** 13px in a dense card, 14px on a line of its own. Left out, it takes the size of the text it sits in. */
  size?: keyof typeof LINK_SIZE;
  /** Blue by default; `danger` for a quiet destructive action (Decline); `inherit` on a coloured banner or bubble, whose text colour it keeps. */
  tone?: keyof typeof LINK_TONE;
  /** Inside a sentence: underlined at rest too, so it isn't told from the words round it by colour alone. */
  inline?: boolean;
  /** Where it sits, and its layout when it holds an icon (`inline-flex items-center gap-1.5`). */
  className?: string;
} & (
  | { href: string; /** Another site: opens in a new tab. */ external?: boolean; "aria-label"?: string }
  | ({ href?: undefined } & Pick<React.ComponentProps<"button">, "onClick" | "onMouseDown" | "disabled" | "ref" | "aria-label" | "aria-expanded">)
);

/**
 * Every link in text, and every action drawn as one: the one blue, medium weight, an underline on
 * hover (always, `inline`). With `href` it's a link, inside the app or out (`external`); with
 * `onClick` it's a button in the same look, grey while `disabled`. A name that opens something (a
 * task's title, a role's) is not one of these: it stays in the ink of the text it is.
 */
export function TextLink({ children, size, tone = "primary", inline = false, className = "", ...to }: TextLinkProps) {
  const look = `rounded-sm font-medium underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${LINK_TONE[tone]} ${size ? LINK_SIZE[size] : ""} ${className}`;
  if (to.href !== undefined) {
    const cls = `${look} ${inline ? "underline" : "hover:underline"}`;
    if (to.external)
      return (
        <a href={to.href} target="_blank" rel="noreferrer" aria-label={to["aria-label"]} className={cls}>
          {children}
        </a>
      );
    return (
      <Link href={to.href} aria-label={to["aria-label"]} className={cls}>
        {children}
      </Link>
    );
  }
  const { href: _href, ...button } = to;
  return (
    <button type="button" {...button} className={`${look} ${inline ? "underline" : "enabled:hover:underline"} disabled:cursor-not-allowed disabled:text-ink-disabled disabled:no-underline`}>
      {children}
    </button>
  );
}
