"use client";

import { useCallback, useState } from "react";

/**
 * How a page's toast reads: `success` for what went through; `danger` for what was refused or
 * failed, which is announced at once and stays up longer; `info` for a note, like a demo stand-in
 * for something that opens elsewhere.
 */
export type ToastTone = "success" | "danger" | "info";

/** What a page's toast says, and how. */
export type PageToast = { message: string; tone: ToastTone };

/** Puts the page's toast up — a success unless a tone says otherwise — or, given null, takes it down. */
export type SetToast = (message: string | null, tone?: ToastTone) => void;

/**
 * One toast per page: `const [toast, setToast] = useToast();`, then `setToast("Card added")` or
 * `setToast(r.error, "danger")`, and `<Toast toast={toast} onClose={() => setToast(null)} />`.
 */
export function useToast(): [PageToast | null, SetToast] {
  const [toast, setPageToast] = useState<PageToast | null>(null);
  const setToast = useCallback<SetToast>((message, tone = "success") => setPageToast(message === null ? null : { message, tone }), []);
  return [toast, setToast];
}
