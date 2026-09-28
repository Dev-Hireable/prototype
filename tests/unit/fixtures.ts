import { dayOf, isoOf, type Day } from "../../src/lib/work/dates";
import { WorkError } from "../../src/lib/work/errors";
import type { WorkItem } from "../../src/lib/work/model";
import type { WorkAccess } from "../../src/lib/work/permissions";
import type { Clock, WorkPort, WorkState } from "../../src/lib/work/repository";

/** Friday 25 Sep 2026 — the tests' today. */
export const TODAY_ISO = "2026-09-25";
export const TODAY: Day = dayOf(TODAY_ISO) as Day;
export const iso = (offset: number) => isoOf(TODAY + offset);

let n = 0;

/** A complete item with sensible defaults — the Independent's To do task. */
export function item(over: Partial<WorkItem> = {}): WorkItem {
  n++;
  return {
    id: `i${n}`,
    number: n,
    title: `Item ${n}`,
    status: "todo",
    type: "task",
    assignee: "independent",
    dependsOn: [],
    tags: [],
    order: n * 1024,
    addedBy: "team",
    created: "25 Sep 2026",
    createdAt: 1_000 + n,
    updatedAt: 1_000 + n,
    version: 1,
    subtasks: [],
    activity: [],
    comments: [],
    ...over,
  };
}

export const OPEN: WorkAccess = { open: true, reviewOpen: true, trial: false };
export const TRIAL: WorkAccess = { open: true, reviewOpen: true, trial: true, lastDay: iso(30) };
/** A trial past its last day, being evaluated — what `accessOf` gives a closed trial. */
export const REVIEW_ONLY: WorkAccess = { open: false, reviewOpen: true, trial: true, trialClosed: true, lastDay: iso(-1), closedReason: "The trial has closed." };
export const ENDED: WorkAccess = { open: false, reviewOpen: false, trial: false, closedReason: "This contract has ended." };

export const clock = (ms = 1_000_000): Clock => () => ({ ms, today: TODAY, moment: "25 Sep 2026, 9:00 AM", stamp: "25 Sep 2026" });

/**
 * The store as one JSON string, like localStorage: every transaction parses the latest copy, and a
 * failed save leaves it untouched. `failNext` makes the next save throw, as a full disk would.
 */
export function memoryStore(initial: Partial<WorkState> = {}, access: WorkAccess = OPEN) {
  let raw = JSON.stringify({ items: [], nextNumber: 100, logs: {}, ...initial });
  let failNext = false;
  let writes = 0;
  const store = {
    access,
    port: {
      transact(fn) {
        const state = JSON.parse(raw) as WorkState;
        const { next, result } = fn(state, { access: store.access });
        if (next) {
          if (failNext) {
            failNext = false;
            throw new WorkError("storage", "Your browser couldn't save this change.");
          }
          raw = JSON.stringify(next);
          writes++;
        }
        return result;
      },
    } satisfies WorkPort,
    read: () => JSON.parse(raw) as WorkState,
    get: (id: string) => (JSON.parse(raw) as WorkState).items.find((t) => t.id === id) as WorkItem,
    failNextSave: () => {
      failNext = true;
    },
    writes: () => writes,
  };
  return store;
}

/** The error a promise rejects with. */
export async function rejection(p: Promise<unknown>): Promise<WorkError> {
  try {
    await p;
  } catch (e) {
    return e as WorkError;
  }
  throw new Error("Expected the call to fail, but it succeeded.");
}
