import { useSyncExternalStore } from "react";

/** Below this the app is laid out for a phone: a tab bar, bottom sheets (globals.css's max-md). */
export const PHONE = "(max-width: 767px)";

/** Whether a media query matches — false on the server and the first paint, then live. */
export function useMedia(query: string) {
  return useSyncExternalStore(
    (fn) => {
      const m = matchMedia(query);
      m.addEventListener("change", fn);
      return () => m.removeEventListener("change", fn);
    },
    () => matchMedia(query).matches,
    () => false,
  );
}
