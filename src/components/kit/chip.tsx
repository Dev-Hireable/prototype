"use client";

import type { ReactNode } from "react";
import { ICONS } from "@/components/icons";

export function Chip({ children, onRemove, size = "md" }: { children: ReactNode; onRemove?: () => void; size?: "sm" | "md" }) {
  const X = ICONS.close;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded bg-surface-2 leading-[1.2] font-medium tracking-[0.2px] whitespace-nowrap text-ink-2 shadow-[inset_0_0_0_0.5px_var(--color-border)] ${
        size === "sm" ? "h-6 px-2 text-[12px]" : "h-8 px-3 text-[14px]"
      }`}
    >
      {children}
      {onRemove && (
        <button type="button" onClick={onRemove} aria-label="Remove" className="text-ink-2">
          <X size={12} aria-hidden />
        </button>
      )}
    </span>
  );
}
