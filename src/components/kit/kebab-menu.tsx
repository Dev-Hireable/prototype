"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { ICONS } from "@/components/icons";
import { ICON_BUTTON } from "@/components/kit/styles";
import { Tip } from "@/components/kit/tip";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

/** Row spacing on top of the dropdown item's own look: `regular` for icon rows, `compact` for plain ones. */
function menuItemClass(destructive: boolean, className: string) {
  return `w-full px-3 text-left ${destructive ? "text-danger" : "text-ink"} ${className}`;
}

/**
 * A row in a KebabMenu — shadcn's DropdownMenuItem, so it takes the arrow keys, typeahead and
 * closes the menu when picked. A disabled row keeps its reason as a tooltip (`title`).
 */
export function MenuAction({
  children,
  destructive = false,
  className = "",
  onClick,
  disabled,
  title,
}: {
  children: ReactNode;
  destructive?: boolean;
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
  /** Why the row is disabled, shown as the app's tooltip. */
  title?: string;
}) {
  return (
    <Tip label={title} wrap={!!disabled} wrapClassName="w-full">
      <DropdownMenuItem onClick={onClick} disabled={disabled} variant={destructive ? "destructive" : "default"} className={menuItemClass(destructive, className)}>
        {children}
      </DropdownMenuItem>
    </Tip>
  );
}

export function MenuLink({
  href,
  children,
  destructive = false,
  className = "",
}: {
  href: string;
  children: ReactNode;
  destructive?: boolean;
  className?: string;
}) {
  return (
    <DropdownMenuItem render={<Link href={href} />} variant={destructive ? "destructive" : "default"} className={menuItemClass(destructive, className)}>
      {children}
    </DropdownMenuItem>
  );
}

/**
 * The "⋮" actions menu on cards and table rows: shadcn's DropdownMenu (Base UI) behind the kebab
 * button, filled with MenuAction / MenuLink rows. `open` is controlled so a page can close it
 * after an action; picking a row, Escape and a click outside close it on their own.
 */
export function KebabMenu({
  label,
  open,
  onOpenChange,
  children,
  menuWidth = 192,
  buttonClassName = "",
  menuClassName = "",
}: {
  label: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: ReactNode;
  menuWidth?: number;
  buttonClassName?: string;
  menuClassName?: string;
}) {
  return (
    <DropdownMenu open={open} onOpenChange={(next) => onOpenChange?.(next)}>
      <Tip label="More actions" off={open}>
        <DropdownMenuTrigger
          aria-label={label}
          // A kebab often sits on a clickable card or row; opening it shouldn't open that too.
          onClick={(event) => event.stopPropagation()}
          className={`${ICON_BUTTON} size-8 ${buttonClassName}`}
        >
          <ICONS.moreV size={18} aria-hidden />
        </DropdownMenuTrigger>
      </Tip>
      <DropdownMenuContent align="end" className={menuClassName} style={{ width: menuWidth }} onClick={(event) => event.stopPropagation()}>
        {children}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
