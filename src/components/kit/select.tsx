"use client";

import { type ChangeEvent, useEffect, useId, useRef, useState } from "react";
import { ICONS } from "@/components/icons";
import { FloatingMenu } from "@/components/kit/floating-menu";
import { FORM_CONTROL } from "@/components/kit/styles";

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
export function Select({ options: all, placeholder = "Select", value, defaultValue, onChange, disabled, className = "", id, name, required, "aria-label": ariaLabel, "aria-labelledby": ariaLabelledBy }: SelectProps) {
  const Chevron = ICONS.chevron;
  const options = all.filter((o) => o !== "");
  const menuId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [selected, commit] = useSelectValue({ value, defaultValue, all, onChange });
  const { open, setOpen, highlighted, setHighlighted, openMenu, step } = useListbox(options, selected, disabled);

  const choose = (next: string) => {
    commit(next);
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
        // A phone's filter rows size the box, not the button (PHONE_FILTER_ROW), so it fills it there.
        className={`${FORM_CONTROL} appearance-none pr-11 text-left focus-visible:ring-2 focus-visible:ring-primary/30 ${className} max-md:w-full!`}
      >
        <span className={`block truncate ${selected ? "" : "text-muted-2"}`}>{selected || placeholder}</span>
      </button>
      {name && <input type="hidden" name={name} value={selected} required={required} />}
      <Chevron size={24} aria-hidden className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-ink" />
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
          <SelectOption key={option} option={option} selected={option === selected} highlighted={index === highlighted} onHover={() => setHighlighted(index)} onStep={step} onPick={() => choose(option)} />
        ))}
      </FloatingMenu>
    </span>
  );
}

/**
 * A Select's value: `value` when the page controls it, otherwise kept here from `defaultValue` (or
 * the first option). Picking one keeps it here when it's ours and tells `onChange` either way, in the
 * shape of a native select's change event.
 */
function useSelectValue({ value, defaultValue, all, onChange }: Pick<SelectProps, "value" | "defaultValue" | "onChange"> & { all: readonly string[] }) {
  const controlled = value !== undefined;
  const [internalValue, setInternalValue] = useState(() => String(defaultValue ?? all[0] ?? ""));
  const selected = controlled ? String(value ?? "") : internalValue;
  const commit = (next: string) => {
    if (!controlled) setInternalValue(next);
    onChange?.({ target: { value: next }, currentTarget: { value: next } } as unknown as ChangeEvent<HTMLSelectElement>);
  };
  return [selected, commit] as const;
}

/**
 * A Select's list: whether it's open and which option is highlighted — the focus follows it (see
 * SelectOption) — and opening on the picked option (not while disabled or empty). The arrow keys step
 * round from either end.
 */
function useListbox(options: readonly string[], selected: string, disabled: boolean | undefined) {
  const selectedIndex = Math.max(0, options.indexOf(selected));
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(selectedIndex);

  const openMenu = () => {
    if (disabled || options.length === 0) return;
    setHighlighted(selectedIndex);
    setOpen(true);
  };
  const step = (key: "ArrowDown" | "ArrowUp") => setHighlighted((current) => (current + (key === "ArrowDown" ? 1 : options.length - 1)) % options.length);
  return { open, setOpen, highlighted, setHighlighted, openMenu, step };
}

/**
 * One option in a Select's list: the pointer highlights it, the arrow keys step on, and a click, Enter
 * or Space picks it. The highlighted one takes the focus, from the moment it's on the page: FloatingMenu
 * mounts the options only once it has measured the trigger, so on a first open a focus effect in the
 * Select itself ran before there was an option to focus, and the keys went to the trigger.
 */
function SelectOption({ option, selected, highlighted, onHover, onStep, onPick }: { option: string; selected: boolean; highlighted: boolean; onHover: () => void; onStep: (key: "ArrowDown" | "ArrowUp") => void; onPick: () => void }) {
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (highlighted) ref.current?.focus();
  }, [highlighted]);
  return (
    <button
      ref={ref}
      type="button"
      role="option"
      aria-selected={selected}
      onMouseEnter={onHover}
      onClick={onPick}
      onKeyDown={(event) => {
        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
          event.preventDefault();
          onStep(event.key);
        } else if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onPick();
        }
      }}
      className="flex w-full items-center justify-between gap-2 py-2 pr-2 pl-3 text-left text-ink hover:bg-surface-2 focus-visible:bg-surface-2 focus-visible:outline-none"
    >
      {option}
      <span aria-hidden className="flex size-4 shrink-0 items-center justify-center">
        {selected && <ICONS.check size={16} />}
      </span>
    </button>
  );
}
