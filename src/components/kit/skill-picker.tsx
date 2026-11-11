"use client";

import { type KeyboardEvent as ReactKeyboardEvent, useId, useRef, useState } from "react";
import { ICONS } from "@/components/icons";
import { FloatingMenu } from "@/components/kit/floating-menu";
import { FORM_CONTROL } from "@/components/kit/styles";

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
  const { query, open, setOpen, highlighted, setHighlighted, matches, items, full, add, search, onKeyDown } = useSkillSearch(options, value, onChange, max);

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
        onChange={(e) => search(e.target.value)}
        onKeyDown={onKeyDown}
        className={`${FORM_CONTROL} pr-11`}
      />
      <Chevron size={24} aria-hidden className="pointer-events-none absolute top-2.5 right-4 text-ink" />
      <FloatingMenu open={open && !full && items.length > 0} anchorRef={inputRef} onClose={() => setOpen(false)} role="listbox" itemCount={items.length} id={menuId}>
        {items.map((skill, index) => {
          const custom = index === matches.length;
          return <SkillOption key={custom ? `custom:${skill}` : skill} id={`${menuId}-${index}`} skill={skill} custom={custom} highlighted={index === highlighted} onHover={() => setHighlighted(index)} onPick={() => add(skill)} />;
        })}
      </FloatingMenu>
    </span>
  );
}

/**
 * What a SkillPicker suggests for the search `q`: the options not picked yet that contain it, then,
 * when it's neither an option nor picked, what was typed, to add as it is. `taken` is what's picked.
 */
function suggestionsFor(options: readonly string[], value: string[], q: string) {
  const taken = new Set(value.map((s) => s.toLowerCase()));
  const matches = options.filter((s) => !taken.has(s.toLowerCase()) && s.toLowerCase().includes(q.toLowerCase()));
  const exact = options.some((s) => s.toLowerCase() === q.toLowerCase());
  const items = q && !exact && !taken.has(q.toLowerCase()) ? [...matches, q] : matches;
  return { taken, matches, items };
}

/**
 * A SkillPicker's search: what's typed, whether its suggestions are open and which is highlighted,
 * adding one (which clears the search and closes the list), and the keys — the arrows walk the list
 * round from either end, Enter adds, Backspace in an empty box takes the last skill off, Tab closes.
 */
function useSkillSearch(options: readonly string[], value: string[], onChange: (next: string[]) => void, max: number) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const { taken, matches, items } = suggestionsFor(options, value, query.trim());
  const full = value.length >= max;

  const add = (skill: string) => {
    if (full || taken.has(skill.toLowerCase())) return;
    onChange([...value, skill]);
    setQuery("");
    setHighlighted(0);
    setOpen(false);
  };
  /** Typing searches afresh: the list opens again on its first suggestion. */
  const search = (text: string) => {
    setQuery(text);
    setHighlighted(0);
    setOpen(true);
  };
  const onKeyDown = (e: ReactKeyboardEvent<HTMLInputElement>) => {
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
  };
  return { query, open, setOpen, highlighted, setHighlighted, matches, items, full, add, search, onKeyDown };
}

/** A suggestion in a SkillPicker's list, or the offer to add what was typed. Pressing it leaves the focus in the input. */
function SkillOption({ id, skill, custom, highlighted, onHover, onPick }: { id: string; skill: string; custom: boolean; highlighted: boolean; onHover: () => void; onPick: () => void }) {
  return (
    <div
      id={id}
      role="option"
      aria-selected={highlighted}
      onMouseDown={(e) => e.preventDefault()}
      onMouseEnter={onHover}
      onClick={onPick}
      className={`flex w-full cursor-pointer items-center px-3 py-2 ${highlighted ? "bg-surface-alt" : ""} text-ink`}
    >
      {custom ? (
        <span>
          <span className="text-ink-2">Can&apos;t find it?</span> Add &ldquo;<span className="font-semibold">{skill}</span>&rdquo;
        </span>
      ) : (
        skill
      )}
    </div>
  );
}
