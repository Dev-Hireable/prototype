import { useState } from "react";
import { isCompleted, refOf, type unfinishedOf, type WorkItem } from "@/lib/work/model";
import { transitionFor } from "@/lib/work/permissions";
import type { DetailFocus, WorkspaceEnv } from "./context";

/**
 * The next step on an item for whoever's looking, beside its status at the top of its sheet: send it
 * for review (with a note), take it back, approve it or ask for changes, or — on the Team Builder's
 * own work — mark it done or reopen it.
 */
export type Step = "submit" | "takeBack" | "review" | "complete" | "reopen";

/** The panel a step opens under the top bar: the note and the send (the Independent's), or what should change (the Team Builder's). */
export type StepBox = "send" | "changes";

/** Which next step this person has on the item, if any. */
export function stepFor(t: WorkItem, { actor, access, names }: Pick<WorkspaceEnv, "actor" | "access" | "names">): Step | null {
  const can = (to: WorkItem["status"]) => transitionFor(t, actor, access, to, names).ok;
  if (actor.role === "contributor" && can("review")) return "submit";
  if (actor.role === "contributor" && t.status === "review" && can("doing")) return "takeBack";
  if (t.status === "review" && can("done")) return "review";
  if (actor.role !== "manager" || t.assignee === "independent") return null;
  if (!isCompleted(t.status)) return can("done") ? "complete" : null;
  return can("todo") ? "reopen" : null;
}

/** The step's panel, while it's open and still this step's: one left open as the status moved on doesn't show. */
export const openBox = (step: Step | null, box: StepBox | null): StepBox | null => ((box === "send" && step === "submit") || (box === "changes" && step === "review") ? box : null);

/** The panel opening the item for a reason opens: a send that asks first, or asking for changes. */
const boxFor = (focus: DetailFocus | undefined): StepBox | null => (focus === "submit" ? "send" : focus === "changes" ? "changes" : null);

/**
 * Which step panel is open: the one opening the item for a reason opens (`focus`), from the start and
 * again whenever it's opened for it anew; otherwise it opens and closes by hand.
 */
export function useStepBox(focus: DetailFocus | undefined) {
  const [box, setBox] = useState<StepBox | null>(() => boxFor(focus));
  const [seen, setSeen] = useState(focus);
  if (seen !== focus) {
    setSeen(focus);
    if (boxFor(focus)) setBox(boxFor(focus));
  }
  return [box, setBox] as const;
}

/** "#3 is waiting on #2 Draft two logo directions and has 1 open subtask. Send it for review anyway?" */
export function unfinishedQuestion(t: WorkItem, { blockers, openSubtasks }: NonNullable<ReturnType<typeof unfinishedOf>>) {
  const waits = blockers.length ? `is waiting on ${listed(blockers.map((b) => `${refOf(b)} ${b.title}`))}` : null;
  const subs = openSubtasks ? `has ${openSubtasks} open ${openSubtasks === 1 ? "subtask" : "subtasks"}` : null;
  const what = waits && subs ? `${waits}${blockers.length > 1 ? "," : ""} and ${subs}` : (waits ?? subs);
  return `${refOf(t)} ${what}. Send it for review anyway?`;
}

/** "a", "a and b", "a, b and c". */
const listed = (xs: string[]) => (xs.length < 2 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`);
