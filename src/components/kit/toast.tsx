"use client";

import { useEffect, useEffectEvent, useRef } from "react";
import { type ToastAction, dismissToast, raiseToast } from "@/components/kit/notify";
import type { PageToast } from "@/lib/portal/toast";

/**
 * A page's toast (`useToast` in @/lib/portal/toast), drawn by raiseToast in the app's one Toaster
 * (@/components/kit/toaster), top right; the page itself renders nothing. A `danger` one explains
 * something that was refused or didn't work and is announced at once (an alert);
 * `action` offers the one thing to do about it — Undo, Retry, Use mine — and keeps the toast up longer
 * so there's time to click it. While the pointer is on it, the countdown waits (WCAG 2.2.1): reaching
 * for Undo never loses it.
 */
export function Toast({ toast, onClose, action }: { toast: PageToast | null; onClose: () => void; action?: ToastAction }) {
  /** The toast this page has up: one taken down to make way for the next mustn't clear the page's. */
  const current = useRef<string | number | null>(null);
  const closed = useEffectEvent((id: string | number) => {
    if (id === current.current) onClose();
  });
  const act = useEffectEvent(() => action?.onClick());
  const actionLabel = action?.label;
  useEffect(() => {
    if (!toast) return;
    const id = raiseToast(toast, actionLabel ? { label: actionLabel, onClick: () => act() } : undefined, (dismissed) => closed(dismissed));
    current.current = id;
    return () => {
      current.current = null;
      dismissToast(id);
    };
  }, [toast, actionLabel]);
  return null;
}
