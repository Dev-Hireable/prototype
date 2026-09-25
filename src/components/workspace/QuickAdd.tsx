"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { ICONS } from "@/components/admin/icons";
import { ICON_BUTTON } from "@/components/portal/styles";
import { StatusCircle } from "@/components/portal/tasks/task-bits";
import { checkTitle, type Invalid } from "@/lib/work/validate";

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
}: {
  /** Creates the item; the promise settles when it's saved (or refused). */
  onAdd: (title: string) => unknown;
  label?: string;
  /** The name field's accessible name. */
  fieldLabel?: string;
  placeholder?: string;
  /** `inline` sits on a white surface, like an item's sheet, and opens into an outlined entry row. */
  variant?: "row" | "card" | "cell" | "inline";
  /** What the new item inherits, said beside the field ("In Design · assigned to Juan"). */
  hint?: string;
  startOpen?: boolean;
  onClose?: () => void;
  /** What's wrong with a name, if anything — a task's rules by default. */
  check?: (title: string) => Invalid | null;
  /** What sits before the field: the status a new task starts at, or a subtask's empty box. */
  marker?: ReactNode;
}) {
  const [open, setOpen] = useState(startOpen);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const form = useRef<HTMLFormElement>(null);
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
    setText("");
    setError(null);
    onClose?.();
  };

  const add = (title: string) => {
    const bad = check(title);
    if (bad) {
      setError(bad.message);
      return false;
    }
    void onAdd(title.trim());
    setText("");
    setError(null);
    return true;
  };

  if (!open)
    return (
      <button
        ref={button}
        type="button"
        onClick={() => setOpen(true)}
        className={
          variant === "card"
            ? "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[13.5px] leading-[1.2] text-ink-2 hover:bg-white hover:text-ink focus-visible:outline-2 focus-visible:outline-primary"
            : variant === "cell"
              ? `${ICON_BUTTON} size-6`
              : variant === "inline"
                ? "-mx-1.5 flex h-8 items-center gap-2 self-start rounded-md px-1.5 text-[13.5px] leading-[1.2] font-medium text-ink-2 hover:bg-surface-2 hover:text-ink focus-visible:outline-2 focus-visible:outline-primary"
                : "flex w-full items-center gap-2.5 border-t border-[#eeeeee] px-4 py-2.5 text-left text-[13.5px] leading-[1.2] text-ink-2 hover:bg-surface-alt hover:text-ink focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary"
        }
        aria-label={variant === "cell" ? label : undefined}
      >
        <ICONS.add size={variant === "cell" || variant === "inline" ? 16 : 18} aria-hidden />
        {variant !== "cell" && label}
      </button>
    );

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
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
  };

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
      className={
        variant === "card"
          ? "flex flex-col gap-1.5 rounded-lg bg-white p-2 outline -outline-offset-1 outline-primary"
          : variant === "cell"
            ? "flex flex-col gap-1 rounded-md bg-white p-1 shadow-[0_4px_16px_rgba(0,0,0,.12)] outline -outline-offset-1 outline-primary"
            : variant === "inline"
              ? "flex flex-col gap-1.5 rounded-lg bg-white py-1 pr-1 pl-2.5 outline -outline-offset-1 outline-primary ring-3 ring-primary/15"
              : "flex flex-col gap-1 border-t border-[#eeeeee] px-4 py-1.5"
      }
    >
      <span className="flex items-center gap-2">
        {variant !== "cell" && marker}
        <input
          autoFocus
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setError(null);
          }}
          onKeyDown={onKeyDown}
          aria-label={fieldLabel}
          aria-invalid={!!error}
          placeholder={placeholder}
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
        hint && <span className="text-[12px] leading-[1.3] text-ink-2">{hint}</span>
      )}
    </form>
  );
}
