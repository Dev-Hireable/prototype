"use client";

import { type ReactNode, type RefObject, useEffect, useEffectEvent, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { uiZoom } from "@/lib/portal/zoom";

type MenuPosition = { top: number; left: number; width: number };

function getMenuPosition(anchor: DOMRect, width: number, itemCount: number, align: "start" | "end"): MenuPosition {
  const maxHeight = Math.min(320, Math.max(1, window.innerHeight - 16));
  const estimatedHeight = Math.min(maxHeight, itemCount * 40 + 8);
  const top = anchor.bottom + estimatedHeight + 4 <= window.innerHeight - 8 ? anchor.bottom + 4 : Math.max(8, anchor.top - estimatedHeight - 4);
  const rawLeft = align === "end" ? anchor.right - width : anchor.left;
  const left = Math.max(8, Math.min(rawLeft, window.innerWidth - width - 8));
  return { top, left, width };
}

export function FloatingMenu({
  open,
  anchorRef,
  onClose,
  role,
  itemCount,
  width,
  align = "start",
  id,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
  className = "",
  children,
}: {
  open: boolean;
  anchorRef: RefObject<HTMLElement | null>;
  onClose: () => void;
  role: "menu" | "listbox";
  itemCount: number;
  width?: number;
  align?: "start" | "end";
  id?: string;
  "aria-label"?: string;
  "aria-labelledby"?: string;
  className?: string;
  children: ReactNode;
}) {
  const { menuRef, position } = useAnchoredMenu(anchorRef, { open, onClose, width, itemCount, align });
  if (!open || !position || typeof document === "undefined") return null;
  return createPortal(
    <div
      ref={menuRef}
      id={id}
      role={role}
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledBy}
      className={`fixed z-[60] max-h-[min(320px,calc(100vh-16px))] overflow-y-auto rounded-lg border border-border bg-white shadow-[0_8px_24px_rgba(0,0,0,.14)] ${className}`}
      style={position}
    >
      {/* Drawn at the app's UI scale, like everything else. */}
      <div className="ui-zoom py-1 text-[14px]">{children}</div>
    </div>,
    document.body,
  );
}

/**
 * An open menu's place beside its anchor, kept there as the page scrolls or resizes, and what closes
 * it: a press outside both, or Escape — which also hands the focus back to the anchor. The menu hears
 * Escape first, on its way down, and claims it (preventDefault), so what the menu sits in stays open:
 * a dialog, and an EditPanel too, whose React onKeyDown used to hear the key before the menu did.
 * `menuRef` goes on the menu.
 */
function useAnchoredMenu(anchorRef: RefObject<HTMLElement | null>, { open, onClose, width, itemCount, align }: { open: boolean; onClose: () => void; width?: number; itemCount: number; align: "start" | "end" }) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<MenuPosition | null>(null);
  const onCloseEvent = useEffectEvent(onClose);

  useEffect(() => {
    if (!open) return;
    const update = () => {
      const anchor = anchorRef.current;
      if (!anchor) return;
      const rect = anchor.getBoundingClientRect();
      // Placed in screen pixels (it's portalled outside the app's UI scale); its content is scaled below.
      setPosition(getMenuPosition(rect, width !== undefined ? width * uiZoom() : rect.width, itemCount, align));
    };
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (target instanceof Node && (anchorRef.current?.contains(target) || menuRef.current?.contains(target))) return;
      onCloseEvent();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseEvent();
        anchorRef.current?.focus();
      }
    };
    update();
    document.addEventListener("pointerdown", onPointerDown);
    // The capture phase: React runs every onKeyDown from the root as the key bubbles back up.
    window.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown, true);
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [align, anchorRef, itemCount, open, width]);

  return { menuRef, position };
}
