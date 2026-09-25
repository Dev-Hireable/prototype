"use client";

import { Tip } from "@/components/portal/Tip";
import Link from "next/link";
import { createPortal } from "react-dom";
import { useEffect, useEffectEvent, useId, useRef, useState, type ChangeEvent, type ReactNode, type RefObject } from "react";
import { ICONS } from "@/components/admin/icons";
import { FORM_CONTROL, ICON_BUTTON } from "@/components/portal/styles";
import { uiZoom } from "@/lib/portal/zoom";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

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
      // Placed in screen pixels (it's portalled outside the app's UI scale); its content is scaled below.
      setPosition(getMenuPosition(rect, width !== undefined ? width * uiZoom() : rect.width, itemCount, align));
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
      className={`fixed z-[60] max-h-[min(320px,calc(100vh-16px))] overflow-y-auto rounded-lg border border-border bg-white shadow-[0_8px_24px_rgba(0,0,0,.14)] ${className}`}
      style={position}
    >
      {/* Drawn at the app's UI scale, like everything else. */}
      <div className="ui-zoom py-1 text-[14px]">{children}</div>
    </div>,
    document.body,
  );
}

/** Row spacing on top of the dropdown item's own look: `regular` for icon rows, `compact` for plain ones. */
function menuItemClass(density: MenuDensity, destructive: boolean, className: string) {
  const spacing = density === "regular" ? "gap-2.5 px-3 py-[9px]" : "gap-2 px-3 py-2";
  return `w-full text-left ${spacing} ${destructive ? "text-danger" : "text-ink"} ${className}`;
}

/**
 * A row in a KebabMenu — shadcn's DropdownMenuItem, so it takes the arrow keys, typeahead and
 * closes the menu when picked. A disabled row keeps its reason as a tooltip (`title`).
 */
export function MenuAction({
  children,
  icon,
  destructive = false,
  density = "regular",
  className = "",
  onClick,
  disabled,
  title,
}: {
  children: ReactNode;
  icon?: ReactNode;
  destructive?: boolean;
  density?: MenuDensity;
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
  /** Why the row is disabled, shown as the app's tooltip. */
  title?: string;
}) {
  return (
    <Tip label={title} wrap={!!disabled} wrapClassName="w-full">
      <DropdownMenuItem onClick={onClick} disabled={disabled} variant={destructive ? "destructive" : "default"} className={menuItemClass(density, destructive, className)}>
        {icon}
        {children}
      </DropdownMenuItem>
    </Tip>
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
    <DropdownMenuItem render={<Link href={href} />} variant={destructive ? "destructive" : "default"} className={menuItemClass(density, destructive, className)}>
      {icon}
      {children}
    </DropdownMenuItem>
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
  /** Shown, muted, while nothing is picked (the value is ""). */
  placeholder?: string;
};

/**
 * A blank option ("") means nothing picked yet: it shows as the placeholder in the box and never
 * as a row in the list — it used to draw an empty row at the top of the menu.
 */
export function Select({
  options: all,
  placeholder = "Select",
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
  const options = all.filter((o) => o !== "");
  const menuId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const controlled = value !== undefined;
  const [internalValue, setInternalValue] = useState(() => String(defaultValue ?? all[0] ?? ""));
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
        <span className={`block truncate ${selected ? "" : "text-muted-2"}`}>{selected || placeholder}</span>
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
  iconSize = 18,
  menuWidth = 192,
  icon = "vertical",
  buttonClassName = "",
  menuClassName = "",
}: {
  label: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: ReactNode;
  iconSize?: number;
  menuWidth?: number;
  /** ⋮ on cards and rows; ⋯ in a panel's header. */
  icon?: "vertical" | "horizontal";
  buttonClassName?: string;
  menuClassName?: string;
}) {
  const More = icon === "vertical" ? ICONS.moreV : ICONS.moreH;
  return (
    <DropdownMenu open={open} onOpenChange={(next) => onOpenChange?.(next)}>
      <DropdownMenuTrigger
        aria-label={label}
        // A kebab often sits on a clickable card or row; opening it shouldn't open that too.
        onClick={(event) => event.stopPropagation()}
        className={`${ICON_BUTTON} size-8 ${buttonClassName}`}
      >
        <More size={iconSize} aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className={menuClassName} style={{ width: menuWidth }} onClick={(event) => event.stopPropagation()}>
        {children}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * Type-to-filter skill picker: suggests from `options`, lets a typed skill be added when nothing
 * matches, and hides skills already picked. Picking one closes the list; typing or clicking the
 * input reopens it. Focus stays in the input (combobox pattern).
 */
export function SkillPicker({
  options,
  value,
  onChange,
  max = 5,
  placeholder = "Search skills",
}: {
  options: readonly string[];
  value: string[];
  onChange: (next: string[]) => void;
  max?: number;
  placeholder?: string;
}) {
  const Chevron = ICONS.chevron;
  const inputRef = useRef<HTMLInputElement>(null);
  const menuId = useId();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);

  const q = query.trim();
  const taken = new Set(value.map((s) => s.toLowerCase()));
  const matches = options.filter((s) => !taken.has(s.toLowerCase()) && s.toLowerCase().includes(q.toLowerCase()));
  const exact = options.some((s) => s.toLowerCase() === q.toLowerCase());
  const items = q && !exact && !taken.has(q.toLowerCase()) ? [...matches, q] : matches;
  const full = value.length >= max;

  const add = (skill: string) => {
    if (full || taken.has(skill.toLowerCase())) return;
    onChange([...value, skill]);
    setQuery("");
    setHighlighted(0);
    setOpen(false);
  };

  return (
    <span className="relative block">
      <input
        ref={inputRef}
        role="combobox"
        aria-expanded={open && items.length > 0}
        aria-controls={open ? menuId : undefined}
        aria-autocomplete="list"
        aria-activedescendant={open && items[highlighted] ? `${menuId}-${highlighted}` : undefined}
        value={query}
        disabled={full}
        placeholder={full ? `${max} skills selected` : placeholder}
        onFocus={() => setOpen(true)}
        onClick={() => setOpen(true)}
        onChange={(e) => {
          setQuery(e.target.value);
          setHighlighted(0);
          setOpen(true);
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" || e.key === "ArrowUp") {
            e.preventDefault();
            setOpen(true);
            if (items.length) setHighlighted((h) => (h + (e.key === "ArrowDown" ? 1 : items.length - 1)) % items.length);
          } else if (e.key === "Enter") {
            e.preventDefault();
            if (open && items[highlighted]) add(items[highlighted]);
          } else if (e.key === "Backspace" && !query && value.length) {
            onChange(value.slice(0, -1));
          } else if (e.key === "Tab") {
            setOpen(false);
          }
        }}
        className={`${FORM_CONTROL} pr-11`}
      />
      <Chevron size={24} aria-hidden className="pointer-events-none absolute top-2.5 right-4 text-ink" />
      <FloatingMenu open={open && !full && items.length > 0} anchorRef={inputRef} onClose={() => setOpen(false)} role="listbox" itemCount={items.length} id={menuId}>
        {items.map((skill, index) => {
          const custom = index === matches.length;
          return (
            <div
              key={custom ? `custom:${skill}` : skill}
              id={`${menuId}-${index}`}
              role="option"
              aria-selected={index === highlighted}
              onMouseDown={(e) => e.preventDefault()}
              onMouseEnter={() => setHighlighted(index)}
              onClick={() => add(skill)}
              className={`flex w-full cursor-pointer items-center px-3 py-2 ${index === highlighted ? "bg-surface-alt" : ""} text-ink`}
            >
              {custom ? (
                <span>
                  Add &ldquo;<span className="font-semibold">{skill}</span>&rdquo;
                </span>
              ) : (
                skill
              )}
            </div>
          );
        })}
      </FloatingMenu>
    </span>
  );
}
