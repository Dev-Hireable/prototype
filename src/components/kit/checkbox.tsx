"use client";

import type { ReactNode } from "react";
import { Checkbox as CheckboxControl } from "@/components/ui/checkbox";

/**
 * The app's checkbox: shadcn's (Base UI) box, installed with the CLI into components/ui, inside a
 * label so the text beside it toggles it too. Every checkbox in the portals is this one.
 */
export function Checkbox({ checked, onChange, children, disabled, className = "" }: { checked: boolean; onChange?: (v: boolean) => void; children?: ReactNode; disabled?: boolean; className?: string }) {
  return (
    <label className={`inline-flex items-center gap-2.5 text-[14px] leading-[1.4] text-ink ${disabled ? "opacity-50" : "cursor-pointer"} ${className}`}>
      <CheckboxBox checked={checked} disabled={disabled} onChange={onChange} />
      {children}
    </label>
  );
}

/**
 * The same box on its own, for a label that lays out the rest itself: a notification row in Select,
 * where the whole row ticks it. `label` names it for screen readers when the row's words would be too long.
 */
export function CheckboxBox({ checked, onChange, disabled, label, className = "" }: { checked: boolean; onChange?: (v: boolean) => void; disabled?: boolean; label?: string; className?: string }) {
  return <CheckboxControl checked={checked} disabled={disabled} onCheckedChange={(v) => onChange?.(v)} aria-label={label} className={`hit-area bg-white ${className}`} />;
}
