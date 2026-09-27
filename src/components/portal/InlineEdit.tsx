"use client";

import Link from "next/link";
import { useEffect, useRef, type ReactNode } from "react";
import { ICONS } from "@/components/admin/icons";
import { Button } from "@/components/independent/ui";
import { Tip } from "@/components/portal/Tip";

/*
 * Editing in place, one way across the app: the pencil beside what it edits, and the fields that part
 * turns into, then Cancel / Save. Create Role's Review step set the pattern; the talent profile uses
 * the same pieces, so the two can't drift apart.
 */

const Edit = ICONS.edit;

/**
 * An editor that has just closed — Cancel, Escape or Save — took the focus with it, off its fields or
 * buttons; it used to be left on <body>, and the keyboard started again from the top of the page. The
 * part's pencil comes back in the editor's place (the editor replaces the part, pencil and all) and
 * takes the focus as it appears. Set as an EditPanel goes, cleared once that update is over.
 */
let editorClosed = false;

/**
 * The pencil beside a part (a 36px ringed button). While another part is being edited it's disabled,
 * and its tooltip says why. `tip` replaces the plain "Edit" when the pencil does something more
 * particular; `href` makes it a link, for an edit that happens on another page.
 */
export function EditButton({ label, onClick, disabled, href, tip = "Edit" }: { label: string; onClick?: () => void; disabled?: boolean; href?: string; tip?: string }) {
  const name = `Edit ${label.replace(/:$/, "")}`;
  const className = "flex size-9 shrink-0 items-center justify-center rounded-full border border-border text-ink enabled:hover:bg-surface-2 disabled:opacity-40";
  const icon = <Edit size={16} aria-hidden />;
  const button = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    // Back in place of the editor that just closed, and the focus went with it: take it here.
    if (editorClosed && (!document.activeElement || document.activeElement === document.body)) button.current?.focus();
  }, []);
  return (
    <Tip label={disabled ? "Save or cancel your edit first" : tip} wrap={disabled}>
      {href && !disabled ? (
        <Link href={href} aria-label={name} className={`${className} hover:bg-surface-2`}>
          {icon}
        </Link>
      ) : (
        <button ref={button} type="button" aria-label={name} onClick={onClick} disabled={disabled} className={className}>
          {icon}
        </button>
      )}
    </Tip>
  );
}

/**
 * The part being edited, in line with the page — no outline or tint around it: its label, its fields,
 * then Cancel / Save on the right. Escape cancels, unless something inside (an open menu) claimed the
 * key. Closing, either way, hands the focus to the part's pencil as it comes back. `saveTip` says why
 * Save is disabled.
 */
export function EditPanel({
  label,
  error,
  canSave,
  saveTip,
  onSave,
  onCancel,
  children,
}: {
  label: string;
  /** Shown under the fields, e.g. what's stopping the save. */
  error?: ReactNode;
  canSave: boolean;
  saveTip?: string;
  onSave: () => void;
  onCancel: () => void;
  children: ReactNode;
}) {
  // As it goes: the pencil that appears in the same update takes the focus (see `editorClosed`).
  useEffect(
    () => () => {
      editorClosed = true;
      queueMicrotask(() => {
        editorClosed = false;
      });
    },
    [],
  );
  return (
    <div
      className="flex flex-col gap-4"
      onKeyDown={(e) => {
        if (e.key === "Escape" && !e.defaultPrevented) onCancel();
      }}
    >
      <span className="text-[16px] leading-[1.5] font-semibold tracking-[0.2px] text-ink">{label}</span>
      {children}
      {error && <p className="text-[12px] leading-[1.2] tracking-[0.2px] text-danger">{error}</p>}
      <div className="flex justify-end gap-3">
        <Button onClick={onCancel}>Cancel</Button>
        <Button variant="primary" onClick={onSave} disabled={!canSave} title={canSave ? undefined : saveTip}>
          Save
        </Button>
      </div>
    </div>
  );
}
