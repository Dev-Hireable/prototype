"use client";

import { useRef, useState, type ReactNode } from "react";
import { MdOutlineEdit, MdOutlinePhotoCamera } from "react-icons/md";
import { Button, Input, Select, Textarea } from "@/components/independent/ui";
import { TimeZonePicker } from "@/components/portal/TimeZonePicker";

/**
 * The profile editors' parts — the Team Builder's own profile and the company profile draw every
 * row, header and section with these, so the two read as one editor.
 */

/** A section of the editor: a card with a heading and a line on what it's for. */
export function ProfileSection({ title, description, action, children }: { title: string; description?: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="flex w-full flex-col gap-4 rounded-xl bg-white p-6 outline -outline-offset-1 outline-border">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <h2 className="text-[16px] leading-[1.4] font-semibold text-ink">{title}</h2>
          {description && <p className="text-[13px] leading-[1.45] text-ink-2">{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

/**
 * A photo or logo you can change: the image, with a camera button on its corner that opens the file
 * picker. The one way an image is changed anywhere — the Team Builder's profile and company logo,
 * the talent's profile, and both portals' settings — so it reads the same on each side. `accept`
 * and the checks are the caller's (JPG or PNG under 5MB, TB-120 / TB-123 / IN-061).
 */
export function ImagePicker({ image, label, onPick }: { image: ReactNode; /** "Change photo — JPG or PNG, up to 5MB". */ label: string; onPick: (f: File | undefined) => void }) {
  const file = useRef<HTMLInputElement>(null);
  return (
    <div className="relative shrink-0">
      {image}
      <input ref={file} type="file" accept="image/jpeg,image/png" className="hidden" onChange={(e) => (onPick(e.target.files?.[0]), (e.target.value = ""))} />
      <button
        type="button"
        onClick={() => file.current?.click()}
        aria-label={label}
        className="absolute -right-1 -bottom-1 flex size-8 items-center justify-center rounded-full bg-white text-ink shadow-sm outline -outline-offset-1 outline-border transition hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-primary"
      >
        <MdOutlinePhotoCamera size={16} aria-hidden />
      </button>
    </div>
  );
}

/**
 * The top of the editor: the photo or logo with a camera button on it (ImagePicker), the name, and what's under
 * it. A picked image is previewed in place and only replaces the old one on Save; `accept` and the
 * checks are the caller's (JPG or PNG under 5MB, TB-120 / TB-123).
 */
export function ProfileHeader({
  image,
  imageLabel,
  name,
  children,
  pending,
  onPick,
  onSave,
  onDiscard,
}: {
  /** The image as drawn — a photo, a logo, or its initials tile. */
  image: ReactNode;
  /** "Change photo", "Change logo". */
  imageLabel: string;
  name: string;
  /** The lines under the name. */
  children?: ReactNode;
  /** A picked image waiting on Save. */
  pending: boolean;
  onPick: (f: File | undefined) => void;
  onSave: () => void;
  onDiscard: () => void;
}) {
  return (
    <section className="flex w-full flex-wrap items-center gap-5 rounded-xl bg-white p-6 outline -outline-offset-1 outline-border">
      <ImagePicker image={image} label={imageLabel} onPick={onPick} />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <h2 className="font-display truncate text-[24px] leading-[1.3] font-semibold text-ink" style={{ fontVariationSettings: '"opsz" 14' }}>
          {name}
        </h2>
        {children}
      </div>
      {pending && (
        <div className="flex shrink-0 items-center gap-2">
          <span className="text-[12.5px] text-ink-2">New image — not saved yet</span>
          <Button size="sm" onClick={onDiscard}>
            Discard
          </Button>
          <Button size="sm" variant="primary" onClick={onSave}>
            Save
          </Button>
        </div>
      )}
    </section>
  );
}

/**
 * One field, edited where it's read: the row opens into its editor when clicked (or its pencil is
 * pressed), Enter or Save keeps the change, Escape or Cancel drops it. Each row saves on its own.
 * `validate` says why a draft can't be saved; `hint` is shown under the editor (a character count).
 */
export function EditableRow({
  label,
  value,
  kind = "text",
  options,
  placeholder,
  validate,
  hint,
  onSave,
}: {
  label: string;
  value: string;
  /** "timezone" edits with the searchable TimeZonePicker — every zone there is, not a typed string. */
  kind?: RowKind;
  options?: readonly string[];
  placeholder?: string;
  validate?: (draft: string) => string | null;
  hint?: (draft: string) => ReactNode;
  onSave: (value: string) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);

  if (draft !== null)
    return <RowEditor label={label} value={value} kind={kind} options={options} placeholder={placeholder} validate={validate} hint={hint} onSave={onSave} draft={draft} setDraft={setDraft} />;

  return (
    <button
      type="button"
      onClick={() => setDraft(value)}
      aria-label={`${label}: ${value || "not set"}. Edit`}
      className="group relative isolate grid w-full grid-cols-[160px_minmax(0,1fr)_auto] items-center gap-x-4 border-t border-[#eeeeee] py-3 text-left outline-none first:border-t-0 max-sm:grid-cols-[minmax(0,1fr)_auto]"
    >
      {/* The hover and focus box reaches 12px past the text on both sides, so it doesn't stop dead at
          the label and the pencil; the hairlines between rows stay on the text's edges. */}
      <span aria-hidden className="absolute inset-y-0 -right-3 -left-3 -z-10 rounded-lg group-hover:bg-surface-alt group-focus-visible:outline-2 group-focus-visible:outline-primary" />
      <span className="text-[13px] leading-[1.4] font-medium text-ink-2 max-sm:col-span-2">{label}</span>
      <span className={`min-w-0 text-[14px] leading-[1.5] whitespace-pre-line ${value ? "text-ink" : "text-ink-2"}`}>{value || placeholder || "Not set"}</span>
      <span aria-hidden className="flex size-8 items-center justify-center rounded-md text-ink-2 opacity-0 transition group-hover:bg-white group-hover:opacity-100 group-focus-visible:opacity-100">
        <MdOutlineEdit size={17} />
      </span>
    </button>
  );
}

/** What a row edits with: a one-line input, a textarea, a select, or the time zone picker. */
type RowKind = "text" | "long" | "select" | "timezone";

/**
 * A row open in its editor: the field for its kind, what's wrong with the draft (and the hint), and
 * Cancel / Save. Enter saves (Ctrl+Enter in a textarea) and Escape drops the draft.
 */
function RowEditor({
  label,
  value,
  kind,
  options,
  placeholder,
  validate,
  hint,
  onSave,
  draft,
  setDraft,
}: {
  label: string;
  value: string;
  kind: RowKind;
  options?: readonly string[];
  placeholder?: string;
  validate?: (draft: string) => string | null;
  hint?: (draft: string) => ReactNode;
  onSave: (value: string) => void;
  draft: string;
  setDraft: (draft: string | null) => void;
}) {
  const problem = !draft.trim() ? "" : (validate?.(draft) ?? null);
  const canSave = !!draft.trim() && problem === null && draft.trim() !== value.trim();
  const save = () => {
    if (!canSave) return;
    onSave(draft.trim());
    setDraft(null);
  };
  const keys = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      setDraft(null);
    } else if (e.key === "Enter" && (kind !== "long" || e.metaKey || e.ctrlKey) && !e.nativeEvent.isComposing) {
      e.preventDefault();
      save();
    }
  };

  return (
    <div className="grid grid-cols-[160px_minmax(0,1fr)] gap-x-4 gap-y-2 border-t border-[#eeeeee] py-3 first:border-t-0 max-sm:grid-cols-1">
      <span className="pt-2.5 text-[13px] leading-[1.4] font-medium text-ink-2">{label}</span>
      <div className="flex min-w-0 flex-col gap-2">
        <DraftField kind={kind} options={options} label={label} placeholder={placeholder} draft={draft} setDraft={setDraft} onKeyDown={keys} />
        {(hint || problem) && <DraftNote problem={problem} hint={hint} draft={draft} />}
        <EditorActions long={kind === "long"} canSave={canSave} onCancel={() => setDraft(null)} onSave={save} />
      </div>
    </div>
  );
}

/** Under the draft's field: what's wrong with it, announced, and the row's hint (a character count). */
function DraftNote({ problem, hint, draft }: { problem: string | null; hint?: (draft: string) => ReactNode; draft: string }) {
  return (
    <div className="flex items-center justify-between gap-3 text-[12px] leading-[1.4]">
      <span className="text-danger" role={problem ? "alert" : undefined}>
        {problem}
      </span>
      {hint && <span className="text-ink-2">{hint(draft)}</span>}
    </div>
  );
}

/** The editor's foot: the keys that save and cancel (Ctrl+Enter in a textarea), then Cancel and Save. */
function EditorActions({ long, canSave, onCancel, onSave }: { long: boolean; canSave: boolean; onCancel: () => void; onSave: () => void }) {
  return (
    <div className="flex items-center justify-end gap-2">
      <span className="mr-auto text-[12px] text-ink-2">{long ? "Ctrl+Enter to save · Esc to cancel" : "Enter to save · Esc to cancel"}</span>
      <Button size="sm" onClick={onCancel}>
        Cancel
      </Button>
      <Button size="sm" variant="primary" disabled={!canSave} onClick={onSave}>
        Save
      </Button>
    </div>
  );
}

/** The draft's field for the row's kind: the time zone picker, a select, a textarea, or a one-line input. */
function DraftField({
  kind,
  options,
  label,
  placeholder,
  draft,
  setDraft,
  onKeyDown,
}: {
  kind: RowKind;
  options?: readonly string[];
  label: string;
  placeholder?: string;
  draft: string;
  setDraft: (draft: string) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
}) {
  if (kind === "timezone") return <TimeZonePicker value={draft} onChange={setDraft} autoFocus />;
  if (kind === "select" && options) return <Select options={options} value={draft} onChange={(e) => setDraft(e.target.value)} />;
  if (kind === "long") return <Textarea autoFocus rows={4} value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={onKeyDown} aria-label={label} />;
  return <Input autoFocus value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={onKeyDown} aria-label={label} placeholder={placeholder} />;
}

/** How much of a profile is filled in, as a bar and a line on what it unlocks. */
export function Completeness({ done, total, children }: { done: number; total: number; children?: ReactNode }) {
  const pct = total ? Math.round((done / total) * 100) : 0;
  return (
    <div className="flex flex-col gap-2 rounded-lg bg-surface-2 px-4 py-3">
      <div className="flex items-center gap-3">
        <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-white" role="progressbar" aria-label="Profile complete" aria-valuemin={0} aria-valuemax={total} aria-valuenow={done}>
          <span className={`block h-full rounded-full ${done === total ? "bg-ok" : "bg-primary"}`} style={{ width: `${pct}%` }} />
        </span>
        <span className="text-[12.5px] font-semibold text-ink tabular-nums">
          {done} of {total}
        </span>
      </div>
      {children && <p className="text-[12.5px] leading-[1.4] text-ink-2">{children}</p>}
    </div>
  );
}
