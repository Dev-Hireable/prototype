"use client";

import Link from "next/link";
import { createPortal } from "react-dom";
import { useEffect, useEffectEvent, useId, useRef, useState, type ButtonHTMLAttributes, type ChangeEvent, type ReactNode, type RefObject } from "react";
import { ICONS } from "@/components/admin/icons";
import { FORM_CONTROL } from "@/components/portal/styles";

type MenuPosition = { top: number; left: number; width: number };
type MenuDensity = "compact" | "regular";

function getMenuPosition(anchor: DOMRect, width: number, itemCount: number, align: "start" | "end"): MenuPosition {
  const maxHeight = Math.min(320, Math.max(1, window.innerHeight - 16));
  const estimatedHeight = Math.min(maxHeight, itemCount * 40 + 8);
  const top = anchor.bottom + estimatedHeight + 4 <= window.innerHeight - 8 ? anchor.bottom + 4 : Math.max(8, anchor.top - estimatedHeight - 4);
  const rawLeft = align === "end" ? anchor.right - width : anchor.left;
  const left = Math.max(8, Math.min(rawLeft, window.innerWidth - width - 8));
  return { top, left, width };
}

function FloatingMenu({
  open,
  anchorRef,
  onClose,
  role,
  itemCount,
  width,
  align = "start",
  id,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
  className = "",
  children,
}: {
  open: boolean;
  anchorRef: RefObject<HTMLElement | null>;
  onClose: () => void;
  role: "menu" | "listbox";
  itemCount: number;
  width?: number;
  align?: "start" | "end";
  id?: string;
  "aria-label"?: string;
  "aria-labelledby"?: string;
  className?: string;
  children: ReactNode;
}) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<MenuPosition | null>(null);
  const onCloseEvent = useEffectEvent(onClose);

  useEffect(() => {
    if (!open) return;
    const update = () => {
      const anchor = anchorRef.current;
      if (!anchor) return;
      const rect = anchor.getBoundingClientRect();
      setPosition(getMenuPosition(rect, width ?? rect.width, itemCount, align));
    };
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (target instanceof Node && (anchorRef.current?.contains(target) || menuRef.current?.contains(target))) return;
      onCloseEvent();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseEvent();
        anchorRef.current?.focus();
      }
    };
    update();
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [align, anchorRef, itemCount, open, width]);

  if (!open || !position || typeof document === "undefined") return null;
  return createPortal(
    <div
      ref={menuRef}
      id={id}
      role={role}
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledBy}
      className={`fixed z-[60] max-h-[min(320px,calc(100vh-16px))] overflow-y-auto rounded-lg border border-border bg-white py-1 text-[14px] shadow-[0_8px_24px_rgba(0,0,0,.14)] ${className}`}
      style={position}
    >
      {children}
    </div>,
    document.body,
  );
}

function menuItemClass(density: MenuDensity, destructive: boolean, className: string) {
  const spacing = density === "regular" ? "gap-2.5 px-3.5 py-[9px]" : "gap-2 px-3 py-2";
  return `flex w-full items-center ${spacing} text-left ${destructive ? "text-danger" : "text-ink"} hover:bg-surface-alt focus-visible:bg-surface-alt focus-visible:outline-none disabled:cursor-not-allowed disabled:text-[#c3c3c3] ${className}`;
}

export function MenuAction({
  children,
  icon,
  destructive = false,
  density = "regular",
  className = "",
  ...props
}: Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children" | "type" | "role"> & {
  children: ReactNode;
  icon?: ReactNode;
  destructive?: boolean;
  density?: MenuDensity;
}) {
  return (
    <button {...props} role="menuitem" type="button" className={menuItemClass(density, destructive, className)}>
      {icon}
      {children}
    </button>
  );
}

export function MenuLink({
  href,
  children,
  icon,
  destructive = false,
  density = "regular",
  className = "",
}: {
  href: string;
  children: ReactNode;
  icon?: ReactNode;
  destructive?: boolean;
  density?: MenuDensity;
  className?: string;
}) {
  return (
    <Link role="menuitem" href={href} className={menuItemClass(density, destructive, className)}>
      {icon}
      {children}
    </Link>
  );
}

export type SelectProps = {
  options: readonly string[];
  value?: string;
  defaultValue?: string;
  onChange?: (event: ChangeEvent<HTMLSelectElement>) => void;
  disabled?: boolean;
  className?: string;
  id?: string;
  name?: string;
  required?: boolean;
  "aria-label"?: string;
  "aria-labelledby"?: string;
};

export function Select({
  options,
  value,
  defaultValue,
  onChange,
  disabled,
  className = "",
  id,
  name,
  required,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
}: SelectProps) {
  const Chevron = ICONS.chevron;
  const menuId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const controlled = value !== undefined;
  const [internalValue, setInternalValue] = useState(() => String(defaultValue ?? options[0] ?? ""));
  const selected = controlled ? String(value ?? "") : internalValue;
  const selectedIndex = Math.max(0, options.indexOf(selected));
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(selectedIndex);

  useEffect(() => {
    if (open) optionRefs.current[highlighted]?.focus();
  }, [highlighted, open]);

  const openMenu = () => {
    if (disabled || options.length === 0) return;
    setHighlighted(selectedIndex);
    setOpen(true);
  };

  const choose = (next: string) => {
    if (!controlled) setInternalValue(next);
    onChange?.({ target: { value: next }, currentTarget: { value: next } } as unknown as ChangeEvent<HTMLSelectElement>);
    setOpen(false);
    requestAnimationFrame(() => triggerRef.current?.focus());
  };

  return (
    <span className="relative block">
      <button
        ref={triggerRef}
        id={id}
        type="button"
        disabled={disabled}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => (open ? setOpen(false) : openMenu())}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp" || event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            openMenu();
          }
        }}
        className={`${FORM_CONTROL} appearance-none pr-11 text-left focus-visible:ring-2 focus-visible:ring-primary/30 ${className}`}
      >
        <span className="block truncate">{selected}</span>
      </button>
      {name && <input type="hidden" name={name} value={selected} required={required} />}
      <Chevron size={24} aria-hidden className="pointer-events-none absolute top-2.5 right-4 text-ink" />
      <FloatingMenu
        open={open}
        anchorRef={triggerRef}
        onClose={() => setOpen(false)}
        role="listbox"
        itemCount={options.length}
        id={menuId}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
      >
        {options.map((option, index) => (
          <button
            key={option}
            ref={(element) => {
              optionRefs.current[index] = element;
            }}
            type="button"
            role="option"
            aria-selected={option === selected}
            onMouseEnter={() => setHighlighted(index)}
            onClick={() => choose(option)}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                event.preventDefault();
                setHighlighted((current) => (current + (event.key === "ArrowDown" ? 1 : options.length - 1)) % options.length);
              } else if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                choose(option);
              }
            }}
            className={`flex w-full items-center px-3 py-2 text-left focus-visible:bg-surface-alt focus-visible:outline-none ${option === selected ? "bg-accent-bg font-semibold text-accent-ink" : "text-ink hover:bg-surface-alt"}`}
          >
            {option}
          </button>
        ))}
      </FloatingMenu>
    </span>
  );
}

export function KebabMenu({
  label,
  open,
  onOpenChange,
  children,
  itemCount,
  iconSize = 18,
  menuWidth = 192,
  buttonClassName = "",
  menuClassName = "",
}: {
  label: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
  itemCount: number;
  iconSize?: number;
  menuWidth?: number;
  buttonClassName?: string;
  menuClassName?: string;
}) {
  const More = ICONS.moreV;
  const triggerRef = useRef<HTMLButtonElement>(null);
  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={(event) => {
          event.stopPropagation();
          onOpenChange(!open);
        }}
        className={`flex size-8 items-center justify-center rounded-lg text-ink transition hover:bg-surface-alt focus-visible:ring-2 focus-visible:ring-primary/30 ${open ? "bg-accent-bg" : ""} ${buttonClassName}`}
      >
        <More size={iconSize} aria-hidden />
      </button>
      <FloatingMenu
        open={open}
        anchorRef={triggerRef}
        onClose={() => onOpenChange(false)}
        role="menu"
        itemCount={itemCount}
        width={menuWidth}
        align="end"
        className={menuClassName}
      >
        {children}
      </FloatingMenu>
    </>
  );
}
