"use client";

import { useCallback, useState, useSyncExternalStore, type KeyboardEvent } from "react";
import { ICONS } from "@/components/icons";
import { Tip } from "@/components/portal/tip";
import type { AgreedField } from "@/lib/work/permissions";
import { lockLabel } from "./lockable";

/**
 * Escape in a field leaves the field; the next one closes the sheet. The sheet listens on the
 * document as well as on itself, so stopping the bubble alone doesn't keep it open.
 */
function leaveOnly(e: KeyboardEvent) {
  e.stopPropagation();
  e.nativeEvent.stopImmediatePropagation();
}

/**
 * A name or description edited in place, reading as plain text until it's clicked. What's typed is a
 * draft: it saves on Enter (the name) or when focus leaves, Escape throws it away, and if someone
 * else changes the same text meanwhile the draft isn't wiped — it says so, and the save is checked
 * against what was there when editing began, so it can't silently overwrite theirs.
 */
export function DraftText(props: DraftTextProps) {
  if (props.oneLine) return <OneLineText {...props} />;
  return <WrappingText {...props} />;
}

function WrappingText({ value, editable, lock, onSave, label, placeholder, empty, className = "", updatedBy, validate }: DraftTextProps) {
  const draft = useTextDraft(value, onSave, validate);
  // The same lock as every other agreed value (LockedValue), laid out for text that wraps.
  if (!editable && lock)
    return (
      <Tip label="Agreed in the signed offer">
        <button type="button" onClick={() => lock.onLocked(lock.field)} aria-label={lockLabel(lock.field)} className={`${className} flex w-full items-start gap-2 rounded-md px-1.5 py-1 text-left whitespace-pre-line break-words hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-primary`}>
          <span className="min-w-0 flex-1">{value || empty}</span>
          <ICONS.lock size={14} aria-hidden className="mt-1 shrink-0 text-ink-2" />
        </button>
      </Tip>
    );
  if (!editable) return <p className={`${className} px-1.5 py-1 whitespace-pre-line break-words ${!value ? "text-ink-2" : ""}`}>{value || empty}</p>;
  return (
    <div className="flex flex-col gap-1">
      {/* Text on the sheet until it's clicked: no box around it at rest, the placeholder its quiet "Add …" row while it's empty. */}
      <textarea
        value={draft.value}
        aria-label={label}
        aria-invalid={!!draft.error}
        placeholder={placeholder}
        rows={1}
        {...draft.handlers}
        onKeyDown={(e) => {
          if (e.key === "Escape") draft.escape(e);
        }}
        className={`field-sizing-content min-h-8 w-full resize-none rounded-md px-1.5 py-1 outline-none placeholder:text-ink-2 hover:bg-surface-2 focus:bg-white focus:ring-2 focus:ring-primary/30 ${className}`}
      />
      {draft.error && (
        <span role="alert" className="px-1.5 text-[12.5px] text-danger">
          {draft.error}
        </span>
      )}
      {draft.theirs && <TheirChange updatedBy={updatedBy} onUseTheirs={draft.takeTheirs} />}
    </div>
  );
}

/**
 * Whether the text in `ref`'s element is cut short: read from the element itself, again whenever it
 * resizes or the component redraws (a new `value`), so a tooltip that holds the whole of it is already
 * on before the pointer arrives.
 */
function useCut() {
  const [el, ref] = useState<HTMLElement | null>(null);
  const subscribe = useCallback(
    (notify: () => void) => {
      if (!el) return () => {};
      const observer = new ResizeObserver(notify);
      observer.observe(el);
      return () => observer.disconnect();
    },
    [el],
  );
  const cut = useSyncExternalStore(subscribe, () => !!el && el.scrollWidth > el.clientWidth + 1, () => false);
  return { ref, cut };
}

/**
 * DraftText on one line (the sheet's name): cut to "…" when it doesn't fit, with the whole of it in
 * a tooltip — only when it is cut, and not while it's being edited, when the field scrolls instead.
 * An agreed name keeps its lock right after it.
 */
function OneLineText({ value, editable, lock, onSave, label, empty, className = "", autoFocus, updatedBy, validate }: DraftTextProps) {
  const draft = useTextDraft(value, onSave, validate);
  const { ref: measure, cut } = useCut();
  const box = `min-w-0 truncate rounded-md px-1.5 py-0.5 ${className}`;
  if (!editable && lock)
    return (
      <Tip label={cut ? `${value} · Agreed in the signed offer` : "Agreed in the signed offer"}>
        <button type="button" onClick={() => lock.onLocked(lock.field)} aria-label={lockLabel(lock.field)} className={`${box} flex max-w-full items-center gap-2 text-left hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-primary`}>
          <span ref={measure} className="min-w-0 truncate">
            {value || empty}
          </span>
          <ICONS.lock size={15} aria-hidden className="shrink-0 text-ink-2" />
        </button>
      </Tip>
    );
  if (!editable)
    return (
      <Tip label={value} off={!cut}>
        <p ref={measure} className={`${box} flex-1 ${!value ? "text-ink-2" : ""}`}>
          {value || empty}
        </p>
      </Tip>
    );
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1">
      <Tip label={value} off={!cut || draft.editing}>
        {/* Enter saves; out of focus, text-overflow cuts the name to "…". */}
        <input
          value={draft.value}
          aria-label={label}
          aria-invalid={!!draft.error}
          autoFocus={autoFocus}
          maxLength={400}
          {...draft.handlers}
          ref={measure}
          onKeyDown={(e) => {
            if (e.nativeEvent.isComposing) return;
            if (e.key === "Enter") {
              e.preventDefault();
              e.currentTarget.blur();
            }
            if (e.key === "Escape") draft.escape(e);
          }}
          className={`${box} w-full text-ellipsis outline-none hover:bg-surface-2 focus:bg-white focus:ring-2 focus:ring-primary/30`}
          style={{ fontVariationSettings: '"opsz" 14' }}
        />
      </Tip>
      {draft.error && (
        <span role="alert" className="px-1.5 text-[12.5px] text-danger">
          {draft.error}
        </span>
      )}
      {draft.theirs && <TheirChange updatedBy={updatedBy} onUseTheirs={draft.takeTheirs} />}
    </div>
  );
}

type DraftTextProps = {
  /** The sheet's name: one line, cut to "…" with a tooltip (OneLineText). */
  oneLine?: boolean;
  value: string;
  editable: boolean;
  /** Text the signed offer agreed: which field it is, and what trying to change it does — say why it can't be. */
  lock?: { field: AgreedField; onLocked: (field: AgreedField) => void };
  onSave: (next: string, base: string) => void;
  label: string;
  placeholder?: string;
  empty?: string;
  className?: string;
  autoFocus?: boolean;
  updatedBy?: string;
  validate?: (v: string) => string | null;
};

/**
 * The draft over a saved text, from the moment the field takes focus: `base` is the value editing
 * began from, so `theirs` can say someone else has changed it since, and the save is checked
 * against it. `handlers` go on the field; `escape` throws the draft away.
 */
function useTextDraft(value: string, onSave: (next: string, base: string) => void, validate?: (v: string) => string | null) {
  const [draft, setDraft] = useState<string | null>(null);
  const [base, setBase] = useState(value);
  const [error, setError] = useState<string | null>(null);
  const editing = draft !== null;
  // Not being edited: follow the saved value, including other people's changes.
  if (!editing && base !== value) setBase(value);

  const commit = () => {
    if (draft === null) return;
    const next = draft.trim();
    const bad = validate?.(next) ?? null;
    if (bad) {
      setError(bad);
      return;
    }
    setDraft(null);
    setError(null);
    if (next !== base.trim()) onSave(next, base);
  };
  const handlers = {
    onFocus: () => {
      if (draft === null) {
        setDraft(value);
        setBase(value);
      }
    },
    onChange: (e: { target: { value: string } }) => {
      setDraft(e.target.value);
      setError(null);
    },
    // Leaving for another window or tab isn't a decision: the draft waits. Clicking elsewhere
    // on the page saves it.
    onBlur: () => {
      if (typeof document !== "undefined" && !document.hasFocus()) return;
      commit();
    },
  };
  /** Escape: the draft is thrown away, and the field — only the field — is left. */
  const escape = (e: KeyboardEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    e.preventDefault();
    leaveOnly(e);
    setDraft(null);
    setError(null);
    e.currentTarget.blur();
  };
  return { value: draft ?? value, editing, error, theirs: editing && value !== base, handlers, escape, takeTheirs: () => (setDraft(null), setBase(value)) };
}

/** Someone else changed the text mid-edit: said, with Use theirs — or keep typing, and the save checks first. */
function TheirChange({ updatedBy, onUseTheirs }: { updatedBy?: string; onUseTheirs: () => void }) {
  return (
    <span role="status" className="flex flex-wrap items-center gap-2 rounded-md bg-warn-bg px-2 py-1.5 text-[12.5px] text-warn-ink">
      {updatedBy ?? "Someone"} changed this while you were editing.
      <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={onUseTheirs} className="font-semibold underline">
        Use theirs
      </button>
      <span>or keep typing. Saving will check first.</span>
    </span>
  );
}
