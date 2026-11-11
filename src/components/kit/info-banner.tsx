"use client";

import type { ReactNode } from "react";
import { ICONS } from "@/components/icons";
import { ICON_BUTTON } from "@/components/kit/styles";

/**
 * An inline note, as wide as what it says (up to its column) — full width left a one-line note
 * trailing a band of empty colour. A strip across the top of a panel passes its own className
 * (no rounding, no w-fit) and spans the panel.
 */
export function InfoBanner({ children, tone = "info", className = "w-fit max-w-full rounded-lg", onClose }: { children: ReactNode; tone?: "info" | "warn" | "success"; className?: string; /** A banner that can be put away: the toast's × at its end. */ onClose?: () => void }) {
  // `success` says something finished well (a dispute settled or resolved): the ok badge's green.
  const I = tone === "info" ? ICONS.info : tone === "success" ? ICONS.checkCircle : ICONS.warning;
  const look = tone === "info" ? "bg-[#ccedff] text-[#003049]" : tone === "success" ? "bg-ok-bg text-ok-ink" : "bg-warn-bg text-warn-ink";
  return (
    <div className={`flex items-start gap-4 p-4 text-[14px] leading-[1.2] tracking-[0.2px] ${look} ${className}`}>
      <I size={20} aria-hidden className="shrink-0" />
      {/* The rest of the banner, so a strip's action can sit at its right end. A 20px line, the icon's
          height, so the first line sits level with the icon rather than riding above its middle. */}
      <span className="min-w-0 flex-1 leading-5 [overflow-wrap:anywhere]">{children}</span>
      {onClose && (
        // Pulled into the 20px line, so the × sits level with the icon and the first line of text.
        <button type="button" onClick={onClose} aria-label="Dismiss" className={`${ICON_BUTTON} -my-1 -mr-1.5 size-7`}>
          <ICONS.close size={16} aria-hidden />
        </button>
      )}
    </div>
  );
}
