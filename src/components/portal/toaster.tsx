"use client";

import { GooeyToaster } from "goey-toast";
import "goey-toast/styles.css";

/**
 * Where every page's toast (`Toast` in @/components/portal/ui) shows: goey-toast's morphing pill, top
 * right, once for the whole app. Escape is left to dialogs and sheets — a toast up beside an open
 * dialog shouldn't take the key that closes it.
 */
export function Toaster() {
  return <GooeyToaster position="top-right" offset="20px" closeButton="top-right" closeOnEscape={false} showTimestamp={false} preset="smooth" />;
}
