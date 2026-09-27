import type { SuggestionDecision, TaskSuggestion } from "../demo/suggestions";
import type { OfferTask } from "../demo/tasks";

/**
 * The offer as it's negotiated, before anything is agreed. Once it's signed, the contract's versions
 * and amendments take over (@/lib/work/scope). Where it stands:
 *
 *   draft              nothing sent yet: the Team Builder is writing it (the job post's tasks and the
 *                      talent's accepted suggestions are where it starts)
 *   review             sent, and with the talent — revision 1, 2, …
 *   changes_requested  the talent asked for changes to that revision: task suggestions, the rate
 *                      they'd sign for, and a note. The Team Builder answers each in the next revision
 *   revised            the Team Builder sent the next revision; the talent reads what changed
 *   agreed             the talent signed the revision they read — never an older one — and it's v1
 *   declined / withdrawn
 *
 * Every step is on the offer's log with who and when, and every earlier revision is kept as sent.
 */

export type OfferSide = "team" | "independent";

/** One revision's terms and tasks, as it was sent. */
export type OfferRevision = { revision: number; sent: string; rate: string; start: string; end?: string; hours?: number; benefits?: string[]; deposit?: { escrow: number; fee: number }; tasks: OfferTask[] };

/**
 * The talent's request for changes to one revision. Open until the next revision answers it (each
 * suggestion accepted or not taken) or they withdraw it; while it's open they can't sign that revision.
 */
export type OfferRequest = { revision: number; at: string; note: string; suggestions: TaskSuggestion[]; rate?: string; status: "open" | "answered" | "withdrawn"; decisions?: Record<string, SuggestionDecision>; answeredIn?: number };

export type OfferEventKind = "sent" | "revised" | "changes_requested" | "request_withdrawn" | "accepted" | "declined" | "withdrawn";
export type OfferEvent = { kind: OfferEventKind; revision: number; at: string; ts: number; by: OfferSide; name: string; note?: string };

/** What an offer carries for its negotiation — the shape of the deal's offer, as far as this file reads it. */
type Negotiated = Omit<OfferRevision, "revision" | "sent"> & { status: "sent" | "accepted" | "declined" | "withdrawn"; sent: string; updated?: string; revision?: number; history?: OfferRevision[]; request?: OfferRequest; log?: OfferEvent[] };

export const revisionOf = (o: Pick<Negotiated, "revision">) => o.revision ?? 1;

/** The talent's request on the revision that's out now, while it waits on the Team Builder. */
export const openRequest = (o: Negotiated | undefined): OfferRequest | undefined => (o?.status === "sent" && o.request?.status === "open" && o.request.revision === revisionOf(o) ? o.request : undefined);

/** The revision that's out now, as a record like the earlier ones. */
export function currentRevision(o: Negotiated): OfferRevision {
  const { rate, start, end, hours, benefits, deposit, tasks } = o;
  return { revision: revisionOf(o), sent: o.updated ?? o.sent, rate, start, ...(end ? { end } : {}), ...(hours ? { hours } : {}), ...(benefits ? { benefits } : {}), ...(deposit ? { deposit } : {}), tasks };
}

/** The revision before `revision`, if one was kept. */
export const previousRevision = (o: Negotiated, revision = revisionOf(o)) => o.history?.find((r) => r.revision === revision - 1);

/* ------------------------------------------------------------ what changed */

export type OfferTerm = "rate" | "start" | "end" | "hours" | "benefits";
export type TermChange = { field: OfferTerm; was?: string; to?: string };
export type OfferTaskField = "title" | "description" | "week" | "priority";
export type TaskChange = { kind: "added"; task: OfferTask } | { kind: "removed"; task: OfferTask } | { kind: "changed"; task: OfferTask; was: OfferTask; fields: OfferTaskField[] };

const TERMS: OfferTerm[] = ["rate", "start", "end", "hours", "benefits"];
const TASK_FIELDS: OfferTaskField[] = ["title", "description", "week", "priority"];

const termText = (r: OfferRevision, f: OfferTerm): string | undefined => {
  const v = r[f];
  if (v === undefined || (Array.isArray(v) && !v.length)) return undefined;
  return Array.isArray(v) ? v.join(", ") : String(v);
};

/**
 * What changed from one revision to the next: the terms, and each task added, removed or changed
 * (matched by the id a task keeps from revision to revision).
 */
export function offerDiff(before: OfferRevision, after: OfferRevision): { terms: TermChange[]; tasks: TaskChange[] } {
  const terms = TERMS.flatMap((field): TermChange[] => (termText(before, field) === termText(after, field) ? [] : [{ field, was: termText(before, field), to: termText(after, field) }]));
  const was = new Map(before.tasks.map((t) => [t.id, t]));
  const now = new Set(after.tasks.map((t) => t.id));
  const tasks: TaskChange[] = [];
  for (const t of after.tasks) {
    const old = was.get(t.id);
    if (!old) tasks.push({ kind: "added", task: t });
    else {
      const fields = TASK_FIELDS.filter((f) => (old[f] ?? "") !== (t[f] ?? ""));
      if (fields.length) tasks.push({ kind: "changed", task: t, was: old, fields });
    }
  }
  for (const t of before.tasks) if (!now.has(t.id)) tasks.push({ kind: "removed", task: t });
  return { terms, tasks };
}

/**
 * Why the next revision can't go out while the talent's request is open: every suggestion needs an
 * answer, so nothing they asked for is left unresolved when they sign.
 */
export function unanswered(request: OfferRequest | undefined, decisions: Readonly<Record<string, SuggestionDecision>> | undefined): number {
  if (!request || request.status !== "open") return 0;
  return request.suggestions.filter((s) => !decisions?.[s.id]).length;
}
