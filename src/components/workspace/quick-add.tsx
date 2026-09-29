"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode, type Ref } from "react";
import { ICONS } from "@/components/admin/icons";
import { ICON_BUTTON } from "@/components/portal/styles";
import { StatusCircle } from "@/components/portal/tasks/task-bits";
import { checkTitle, type Invalid } from "@/lib/work/validate";

/** Where the adder sits: a list row, a board card, a calendar cell, or inline on a white surface. */
type Variant = "row" | "card" | "cell" | "inline";

/** The "+ Add" button in each place. */
const OPENER: Record<Variant, string> = {
  card: "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[13.5px] leading-[1.2] text-ink-2 hover:bg-white hover:text-ink focus-visible:outline-2 focus-visible:outline-primary",
  cell: `${ICON_BUTTON} size-6`,
  inline: "-mx-1.5 flex h-8 items-center gap-2 self-start rounded-md px-1.5 text-[13.5px] leading-[1.2] font-medium text-ink-2 hover:bg-surface-2 hover:text-ink focus-visible:outline-2 focus-visible:outline-primary",
  row: "flex w-full items-center gap-2.5 border-t border-[#eeeeee] px-4 py-2.5 text-left text-[13.5px] leading-[1.2] text-ink-2 hover:bg-surface-alt hover:text-ink focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary",
};

/** The open entry row in each place. */
const ENTRY: Record<Variant, string> = {
  card: "flex flex-col gap-1.5 rounded-lg bg-white p-2 outline -outline-offset-1 outline-primary",
  cell: "flex flex-col gap-1 rounded-md bg-white p-1 shadow-[0_4px_16px_rgba(0,0,0,.12)] outline -outline-offset-1 outline-primary",
  inline: "flex flex-col gap-1.5 rounded-lg bg-white py-1 pr-1 pl-2.5 outline -outline-offset-1 outline-primary ring-3 ring-primary/15",
  row: "flex flex-col gap-1 border-t border-[#eeeeee] px-4 py-1.5",
};

/**
 * "+ Add task" that turns into a name field, the same everywhere — board columns, list groups,
 * calendar days, and an item's subtasks:
 *
 *   Enter with a name   adds it and stays open for the next one
 *   Enter on nothing    closes
 *   Escape              throws the draft away and closes — only the field, not a sheet around it
 *   clicking elsewhere  adds what was typed (or just closes if nothing was)
 *   switching windows   keeps the draft — leaving the tab isn't a decision
 *   an IME composing    Enter picks the character, it doesn't add
 *
 * Closed from the keyboard, the cursor goes back to the "+" button it came from. Adding is
 * optimistic: the card appears at once and the field is ready for the next. If the save fails, the
 * card goes and a message offers Retry.
 */
export function QuickAdd({
  onAdd,
  label = "Add task",
  fieldLabel = "New task name",
  placeholder = "Name it — Enter to add another",
  variant = "row",
  hint,
  startOpen = false,
  onClose,
  check = checkTitle,
  marker = <StatusCircle status="todo" />,
}: QuickAddProps) {
  const [open, setOpen] = useState(startOpen);
  const button = useRef<HTMLButtonElement>(null);
  /** Closed from the keyboard: put the cursor back on the button once it's back. */
  const refocus = useRef(false);
  useEffect(() => {
    if (open || !refocus.current) return;
    refocus.current = false;
    button.current?.focus();
  }, [open]);

  const close = (fromKeyboard = false) => {
    refocus.current = fromKeyboard;
    setOpen(false);
    onClose?.();
  };

  if (!open) return <Opener ref={button} variant={variant} label={label} onOpen={() => setOpen(true)} />;
  return <Entry variant={variant} field={{ label: fieldLabel, placeholder, marker, hint }} check={check} onAdd={onAdd} close={close} />;
}

type QuickAddProps = {
  /** Creates the item; the promise settles when it's saved (or refused). */
  onAdd: (title: string) => unknown;
  label?: string;
  /** The name field's accessible name. */
  fieldLabel?: string;
  placeholder?: string;
  /** `inline` sits on a white surface, like an item's sheet, and opens into an outlined entry row. */
  variant?: Variant;
  /** What the new item inherits, said beside the field ("In Design · assigned to Juan"). */
  hint?: string;
  startOpen?: boolean;
  onClose?: () => void;
  /** What's wrong with a name, if anything — a task's rules by default. */
  check?: (title: string) => Invalid | null;
  /** What sits before the field: the status a new task starts at, or a subtask's empty box. */
  marker?: ReactNode;
};

/** The open entry row's field: its accessible name and placeholder, what sits before it, and what the new item inherits. */
type EntryField = { label: string; placeholder: string; marker: ReactNode; hint?: string };

/**
 * What's typed and what's wrong with it. `add` checks a name first; one that passes is added and
 * the field cleared for the next.
 */
function useDraftName(check: (title: string) => Invalid | null, onAdd: (title: string) => unknown) {
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const change = (value: string) => {
    setText(value);
    setError(null);
  };
  const add = (title: string) => {
    const bad = check(title);
    if (bad) {
      setError(bad.message);
      return false;
    }
    void onAdd(title.trim());
    change("");
    return true;
  };
  return { text, error, change, add };
}

/** The name field's keys: Escape throws the draft away and closes, Enter adds what's typed (or closes on nothing) — never mid-composition. */
function onEntryKey(e: KeyboardEvent<HTMLInputElement>, text: string, add: (title: string) => boolean, close: (fromKeyboard?: boolean) => void) {
  if (e.nativeEvent.isComposing || e.keyCode === 229) return;
  if (e.key === "Escape") {
    e.preventDefault();
    e.stopPropagation();
    // A sheet around it listens on the document too, where stopping the bubble isn't enough.
    e.nativeEvent.stopImmediatePropagation();
    close(true);
  }
  // Handled here rather than by submitting the form: with nothing typed the Add button is
  // disabled, and a form whose submit button is disabled ignores Enter.
  if (e.key === "Enter") {
    e.preventDefault();
    if (!text.trim()) close(true);
    else add(text);
  }
}

/** Open: the name field, drawn as the item it becomes, with Add — and under it what's wrong with the name, or what the item inherits. */
function Entry({ variant, field, check, onAdd, close }: { variant: Variant; field: EntryField; check: (title: string) => Invalid | null; onAdd: (title: string) => unknown; close: (fromKeyboard?: boolean) => void }) {
  const { text, error, change, add } = useDraftName(check, onAdd);
  const form = useRef<HTMLFormElement>(null);
  return (
    <form
      ref={form}
      onSubmit={(e) => {
        e.preventDefault();
        if (!text.trim()) return close();
        add(text);
      }}
      onBlur={(e) => {
        // Focus moving within the form (to Add), or the whole window losing focus, isn't leaving.
        if (form.current?.contains(e.relatedTarget as Node | null)) return;
        if (typeof document !== "undefined" && !document.hasFocus()) return;
        if (text.trim()) {
          if (add(text)) close();
        } else close();
      }}
      className={ENTRY[variant]}
    >
      <span className="flex items-center gap-2">
        {variant !== "cell" && field.marker}
        {/* react-doctor-disable-next-line react-doctor/no-autofocus -- the box appears on the person's own "Add task", to be typed in */}
        <input
          autoFocus
          value={text}
          onChange={(e) => change(e.target.value)}
          onKeyDown={(e) => onEntryKey(e, text, add, close)}
          aria-label={field.label}
          aria-invalid={!!error}
          placeholder={field.placeholder}
          maxLength={400}
          className="h-8 min-w-0 flex-1 bg-transparent text-[14px] leading-[1.2] text-ink outline-none placeholder:text-ink-2"
        />
        <button type="submit" disabled={!text.trim()} className="h-7 shrink-0 rounded-md bg-primary px-2.5 text-[12px] font-medium text-white disabled:bg-[#e5e5e5] disabled:text-[#9a9a9a]">
          Add
        </button>
      </span>
      {error ? (
        <span role="alert" className="text-[12px] leading-[1.3] text-danger">
          {error}
        </span>
      ) : (
        field.hint && <span className="text-[12px] leading-[1.3] text-ink-2">{field.hint}</span>
      )}
    </form>
  );
}

/** Closed: "+ Add task" — in a calendar cell just the "+", its name given to screen readers instead. */
function Opener({ ref, variant, label, onOpen }: { ref: Ref<HTMLButtonElement>; variant: Variant; label: string; onOpen: () => void }) {
  return (
    <button ref={ref} type="button" onClick={onOpen} className={OPENER[variant]} aria-label={variant === "cell" ? label : undefined}>
      <ICONS.add size={variant === "cell" || variant === "inline" ? 16 : 18} aria-hidden />
      {variant !== "cell" && label}
    </button>
  );
}
