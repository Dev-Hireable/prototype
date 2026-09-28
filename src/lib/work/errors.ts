/**
 * Why a change to the work list didn't happen. Messages are written for the person who tried it —
 * they say what went wrong and what to do, never a stack trace. `name` is a plain field so the
 * error still reads as a WorkError after minification or once serialised (a Playwright
 * `page.evaluate`, a postMessage).
 */
export type WorkErrorCode =
  /** The item or the contract isn't there — archived, or never existed. */
  | "not_found"
  /** This person may not make this change. */
  | "forbidden"
  /** The change itself is invalid: a due date before the start, a dependency loop, an empty title. */
  | "validation"
  /** Someone changed the same thing first; nothing was saved. */
  | "conflict"
  /** The browser refused to save (storage full or blocked); nothing was saved. */
  | "storage"
  /** The saved data can't be read, so nothing is written over it. */
  | "corrupt"
  /** Queued behind a change that failed, so it was dropped rather than applied out of order. */
  | "cancelled";

export type ConflictDetail = { field: string; yours: unknown; theirs: unknown; by?: string };

export class WorkError extends Error {
  readonly name = "WorkError";
  readonly code: WorkErrorCode;
  readonly field?: string;
  readonly conflict?: ConflictDetail;

  constructor(code: WorkErrorCode, message: string, extra?: { field?: string; conflict?: ConflictDetail }) {
    super(message);
    this.code = code;
    this.field = extra?.field;
    this.conflict = extra?.conflict;
  }
}

export function isWorkError(e: unknown): e is WorkError {
  return !!e && typeof e === "object" && (e as { name?: unknown }).name === "WorkError" && typeof (e as { code?: unknown }).code === "string";
}

/** Any failure as something safe to show: a WorkError's own message, otherwise a generic one. */
export function messageOf(e: unknown): string {
  if (isWorkError(e)) return e.message;
  return "Something went wrong and the change wasn't saved. Try again.";
}

export const STORAGE_MESSAGE = "Your browser couldn't save this change (its storage is full or blocked), so nothing was changed. Free up space or try again.";
