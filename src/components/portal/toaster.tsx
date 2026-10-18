"use client";

import { Toaster as Sonner } from "sonner";

/**
 * Where every toast shows (`raiseToast` in @/components/portal/notify draws them): Sonner, top right,
 * once for the whole app — it stacks them, times them out, holds the countdown while one is hovered
 * and lets one be swiped away. Each toast is our own card, so Sonner's look is off.
 */
export function Toaster() {
  return <Sonner position="top-right" offset={20} gap={8} visibleToasts={3} toastOptions={{ unstyled: true }} />;
}
