import type { KeyboardEvent } from "react";

/**
 * Escape in a dialog opened over a profile sheet closes that dialog alone. The sheet (a Base UI
 * Drawer) listens for Escape on the document too, where stopping the bubble isn't enough; React's
 * own listener there runs first, so stopping the event in it keeps the key from the sheet. The
 * dialog is portalled to <body>, so this goes on an element it sits under in React, which its key
 * events still bubble up to. Whether it closed the dialog.
 */
export function closeAloneOnEscape(e: KeyboardEvent, close: () => void): boolean {
  if (e.key !== "Escape" || e.defaultPrevented) return false;
  e.preventDefault();
  e.stopPropagation();
  e.nativeEvent.stopImmediatePropagation();
  close();
  return true;
}
