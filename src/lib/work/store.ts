"use client";

import { useMemo, useSyncExternalStore } from "react";
import { dayLabel, momentLabel } from "@/lib/demo/dates";
import { getDeal, transactDeal, useDeal, useDealStatus } from "@/lib/demo/deal";
import { move as notifyMove, noteComment } from "@/lib/demo/live";
import type { ToastTone } from "@/lib/portal/toast";
import { accessOf } from "./access";
import { todayDay } from "./dates";
import { isWorkError, messageOf, WorkError } from "./errors";
import { migrateProjects } from "./migrate";
import { indexById, isArchived, isTagColor, newId, refOf, TAG_COLORS, type TagColor, type WorkItem, type WorkProject, type WorkStatus } from "./model";
import { orderLast, placeBetween } from "./order";
import { applyOps, type PendingOp } from "./overlay";
import { sideOf, type Actor, type Names, type WorkAccess } from "./permissions";
import { createWorkRepository, type Clock, type CreateInput, type Hook, type PatchField, type WorkNotice, type WorkPatch, type WorkPort, type WorkRepository, type WorkState } from "./repository";
import { normalizeTag } from "./validate";

/**
 * The workspace's connection to the saved contract, for this tab.
 *
 *   dealPort       runs the repository against the saved deal (transactDeal: re-read, check, save
 *                  all or nothing);
 *   useWork        the work list as it should look right now: what's saved, with this tab's
 *                  changes that are still saving laid over it (see ./overlay);
 *   useWorkActions every change the UI can make. Each one shows at once, runs through the
 *                  repository, and either settles into the saved list or is taken back with a
 *                  message saying why. Changes to one item run one after another; if one fails,
 *                  the ones queued behind it are dropped rather than applied to a state that
 *                  never happened.
 *
 * This replaces React's useOptimistic on purpose: an optimistic update needs an async transition,
 * and in this Next version a pending transition holds back router updates — so every view switch,
 * filter and Back/Forward would wait on a save. The pending list is plain synchronous state.
 */

/* ----------------------------------------------------------------- port */

const dealPort: WorkPort = {
  transact(fn) {
    return transactDeal((deal) => {
      const c = deal?.contract;
      if (!deal || !c) throw new WorkError("not_found", "This contract isn't available any more.");
      const tagColors = Object.fromEntries(Object.entries(c.tagColors ?? {}).filter(([, v]) => isTagColor(v))) as Record<string, TagColor>;
      const state: WorkState = { items: c.tasks, nextNumber: c.nextNumber ?? c.tasks.length + 1, logs: c.logs ?? {}, tagColors, projects: migrateProjects(c.projects) };
      const { next, result } = fn(state, { access: accessOf(deal) });
      return { deal: next ? { ...deal, contract: { ...c, tasks: next.items, nextNumber: next.nextNumber, logs: next.logs, tagColors: next.tagColors, projects: next.projects } } : undefined, result };
    });
  },
};

const clock: Clock = () => {
  const d = new Date();
  return { ms: d.getTime(), today: todayDay(d), moment: momentLabel(d), stamp: dayLabel(d) };
};

/** A saved change the other side should hear about, as the notification the demo already sends. */
function tell(n: WorkNotice) {
  const deal = getDeal();
  if (!deal) return;
  const role = { slug: deal.roleSlug, title: deal.title };
  if (n.kind === "task_comment") noteComment(n.from, role, n.task, n.note);
  else notifyMove(n.kind, role, { task: n.task, note: n.note });
}

/* ---------------------------------------------------------- test seam */

let testHook: Hook | undefined;
/** Set by the E2E seam only (./e2e-seam), to slow a save down or make it fail. */
export const setTestHook = (h: Hook | undefined) => {
  testHook = h;
};
const hook: Hook = (op, id) => testHook?.(op, id);

/* ---------------------------------------------------------- repository */

const repos = new Map<string, WorkRepository>();

/** One repository per person, shared by every component in this tab. */
function repositoryFor(actor: Actor, names: Names): WorkRepository {
  const key = JSON.stringify([actor.role, actor.name, names.team, names.independent]);
  let r = repos.get(key);
  if (!r) {
    r = createWorkRepository({ actor, port: dealPort, clock, names, notify: tell, hook });
    repos.set(key, r);
  }
  return r;
}

/* -------------------------------------------------------- pending list */

const NO_OPS: readonly PendingOp[] = [];
let pending: readonly PendingOp[] = NO_OPS;
const pendingListeners = new Set<() => void>();

function setPending(next: readonly PendingOp[]) {
  pending = next.length ? next : NO_OPS;
  for (const fn of pendingListeners) fn();
}

function subscribePending(fn: () => void) {
  pendingListeners.add(fn);
  return () => {
    pendingListeners.delete(fn);
  };
}

const EMPTY_ITEMS: readonly WorkItem[] = [];
const NO_TAG_COLORS: Readonly<Record<string, string>> = {};
const NO_PROJECTS: readonly WorkProject[] = [];

/** The list as it looks now: saved, with this tab's pending changes on top. */
function currentItems(): readonly WorkItem[] {
  return applyOps(getDeal()?.contract?.tasks ?? EMPTY_ITEMS, pending);
}

export type WorkSnapshot = {
  /** loading: the browser hasn't read the store yet; missing: there's no contract; corrupt: it can't be read. */
  status: "loading" | "ready" | "corrupt" | "missing";
  /** Everything, archived items included (views filter them). */
  items: readonly WorkItem[];
  byId: ReadonlyMap<string, WorkItem>;
  /** Items with a change still saving. */
  pendingIds: ReadonlySet<string>;
  access: WorkAccess;
  /** Colours chosen for tags on this contract (read a tag's with tagColorOf). */
  tagColors: Readonly<Record<string, string>>;
  /** TB-148 — the role's projects (@/lib/work/projects). */
  projects: readonly WorkProject[];
};

export function useWork(): WorkSnapshot {
  const deal = useDeal();
  const status = useDealStatus();
  const ops = useSyncExternalStore(subscribePending, () => pending, () => NO_OPS);
  return useMemo(() => {
    const items = applyOps(deal?.contract?.tasks ?? EMPTY_ITEMS, ops);
    return {
      status: status === "loading" ? "loading" : status === "corrupt" ? "corrupt" : deal?.contract ? "ready" : "missing",
      items,
      byId: indexById(items),
      pendingIds: new Set(ops.map((o) => o.itemId)),
      access: accessOf(deal),
      tagColors: deal?.contract?.tagColors ?? NO_TAG_COLORS,
      projects: deal?.contract?.projects ? migrateProjects(deal.contract.projects) : NO_PROJECTS,
    };
  }, [deal, status, ops]);
}

/* ------------------------------------------------------------ messages */

/** What the workspace tells the user about a change: a toast (maybe with an action), or a quiet announcement. */
export type WorkMessage = {
  id: string;
  tone: ToastTone;
  message: string;
  action?: { label: string; run: () => void };
  /** Only for screen readers — no toast. */
  quiet?: boolean;
};

const messageListeners = new Set<(m: WorkMessage) => void>();

export function onWorkMessage(fn: (m: WorkMessage) => void) {
  messageListeners.add(fn);
  return () => {
    messageListeners.delete(fn);
  };
}

function say(m: Omit<WorkMessage, "id">) {
  const msg = { id: newId("m"), ...m };
  for (const fn of messageListeners) fn(msg);
}

/** Says why something can't be changed, where no sheet is open to say it (a List cell's lock): a toast, and read out. */
export const explain = (message: string) => say({ tone: "info", message });

/* --------------------------------------------------------------- queue */

type Job = { run: () => Promise<boolean>; cancel: () => void };
const queues = new Map<string, Job[]>();

function enqueue(itemId: string, job: Job) {
  const q = queues.get(itemId);
  if (q) {
    q.push(job);
    return;
  }
  queues.set(itemId, [job]);
  void drain(itemId);
}

async function drain(itemId: string) {
  const q = queues.get(itemId) as Job[];
  while (q.length) {
    const ok = await q[0].run();
    q.shift();
    if (!ok && q.length) {
      const dropped = q.splice(0);
      for (const j of dropped) j.cancel();
      say({ tone: "info", message: `${dropped.length === 1 ? "Your next change" : `${dropped.length} more changes`} to that item ${dropped.length === 1 ? "was" : "were"} dropped too, since ${dropped.length === 1 ? "it" : "they"} followed the one that failed.`, quiet: true });
    }
  }
  queues.delete(itemId);
}

/* ------------------------------------------------------------- actions */

type Messages = { success?: string; announce?: string; undo?: { label: string; run: () => void } };

type Run = Messages & {
  itemId: string;
  set?: Partial<WorkItem>;
  create?: WorkItem;
  call: () => Promise<unknown>;
  /** Offered when the browser refused to save. */
  retry?: () => void;
  /** Offered when someone changed the same field first: save this over theirs. */
  useMine?: () => void;
};

function report(e: unknown, r: Run) {
  if (!isWorkError(e)) console.error(e);
  const message = messageOf(e);
  if (isWorkError(e) && e.code === "conflict" && r.useMine) say({ tone: "danger", message, action: { label: "Use mine", run: r.useMine } });
  else if (isWorkError(e) && e.code === "storage" && r.retry) say({ tone: "danger", message, action: { label: "Retry", run: r.retry } });
  else say({ tone: "danger", message });
}

function run(r: Run): Promise<boolean> {
  const opId = newId("op");
  if (r.set || r.create) setPending([...pending, { opId, itemId: r.itemId, set: r.set, create: r.create }]);
  const settle = () => setPending(pending.filter((o) => o.opId !== opId));
  return new Promise((resolve) => {
    enqueue(r.itemId, {
      run: async () => {
        try {
          await r.call();
          settle();
          if (r.success) say({ tone: "success", message: r.success, action: r.undo });
          else if (r.announce) say({ tone: "info", message: r.announce, quiet: true });
          resolve(true);
          return true;
        } catch (e) {
          settle();
          report(e, r);
          resolve(false);
          return false;
        }
      },
      cancel: () => {
        settle();
        resolve(false);
      },
    });
  });
}

/** A patch's values as they'd read once saved: trimmed, and null for cleared. */
function shown(changes: WorkPatch): Partial<WorkItem> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(changes)) out[k] = k === "assignee" ? (v ?? null) : v === null ? undefined : typeof v === "string" ? v.trim() || (k === "title" ? "" : undefined) : v;
  return out as Partial<WorkItem>;
}

const pick = (t: WorkItem, keys: PatchField[]) => Object.fromEntries(keys.map((k) => [k, t[k]]));

type MoveRequest = { status?: WorkStatus; set?: WorkPatch; after?: string; before?: string; note?: string };

/** The rank `id` takes under `after` and above `before`, so it shows in its new place before the save lands. */
function orderAt(items: readonly WorkItem[], id: string, after: string | undefined, before: string | undefined, fallback: number): number {
  const place = placeBetween(items, id, after, before);
  return "order" in place ? place.order : (place.renumber.get(id) ?? fallback);
}

/** A new item as it shows while it saves: the save gives it its number, its stamps and its first version. */
function draftOf(input: Omit<CreateInput, "id">, id: string, items: readonly WorkItem[]): WorkItem {
  const now = Date.now();
  const draft: WorkItem = {
    id,
    number: 0,
    title: input.title.trim(),
    ...(input.description ? { description: input.description } : {}),
    status: "todo",
    ...(input.priority ? { priority: input.priority } : {}),
    type: input.type ?? "task",
    assignee: input.assignee === undefined ? "independent" : input.assignee,
    ...(input.start ? { start: input.start } : {}),
    ...(input.due ? { due: input.due } : {}),
    ...(input.effort !== undefined ? { effort: input.effort } : {}),
    ...(input.project ? { project: input.project } : {}),
    dependsOn: [],
    tags: (input.tags ?? []).map(normalizeTag).filter(Boolean),
    order: orderLast(items),
    addedBy: "team",
    created: "",
    createdAt: now,
    updatedAt: now,
    version: 0,
    subtasks: [],
    activity: [],
    comments: [],
  };
  if (input.after || input.before) draft.order = orderAt([...items.filter((t) => !isArchived(t)), draft], id, input.after, input.before, draft.order);
  return draft;
}

/** Adding an item, changing its fields or its status, and dropping it on a board. */
function itemActions(repo: WorkRepository) {
  const actions = {
    /** Adds an item; resolves to its id once saved, or null. A retry reuses the id, so it can't duplicate. */
    create(input: Omit<CreateInput, "id">, msgs: Messages = {}, id = newId("t")): Promise<string | null> {
      const draft = draftOf(input, id, currentItems());
      return run({
        ...msgs,
        itemId: id,
        create: draft,
        call: () => repo.create({ ...input, id }),
        retry: () => void actions.create(input, msgs, id),
      }).then((ok) => (ok ? id : null));
    },

    /** Changes fields, checked against the values this screen showed (`t`) so nobody's change is lost. */
    patch(t: WorkItem, changes: WorkPatch, msgs: Messages = {}, opts: { force?: boolean } = {}) {
      const keys = Object.keys(changes) as PatchField[];
      return run({
        ...msgs,
        itemId: t.id,
        set: shown(changes),
        call: () => repo.patch(t.id, changes, opts.force ? undefined : pick(t, keys)),
        useMine: () => void actions.patch(t, changes, msgs, { force: true }),
        retry: () => void actions.patch(t, changes, msgs, opts),
      });
    },

    transition(t: WorkItem, to: WorkStatus, note?: string, msgs: Messages = {}) {
      return run({
        ...msgs,
        itemId: t.id,
        set: { status: to, ...(to === "review" ? { changes: undefined } : {}) },
        call: () => repo.transition(t.id, { to, from: t.status, note }),
        retry: () => void actions.transition(t, to, note, msgs),
      });
    },

    /** A drop: a new status or group value and a place in the manual order, in one save. */
    move(t: WorkItem, m: MoveRequest, msgs: Messages = {}) {
      const set: Partial<WorkItem> = { ...(m.status ? { status: m.status } : {}), ...(m.set ? shown(m.set) : {}) };
      if (m.after !== undefined || m.before !== undefined) set.order = orderAt(currentItems().filter((x) => !isArchived(x)), t.id, m.after, m.before, t.order);
      return run({
        ...msgs,
        itemId: t.id,
        set,
        call: () => repo.move(t.id, { status: m.status, from: m.status ? t.status : undefined, note: m.note, set: m.set, base: m.set ? pick(t, Object.keys(m.set) as PatchField[]) : undefined, after: m.after, before: m.before }),
        retry: () => void actions.move(t, m, msgs),
      });
    },
  };
  return actions;
}

/** Deleting an item — archived, with an Undo — and restoring it. */
function archiveActions(repo: WorkRepository) {
  const actions = {
    archive(t: WorkItem, msgs: Messages = {}) {
      return run({
        success: `Deleted ${refOf(t)} “${t.title}”`,
        undo: { label: "Undo", run: () => void actions.restore(t, { success: `Restored ${refOf(t)}` }) },
        ...msgs,
        itemId: t.id,
        set: { archivedAt: Date.now(), archivedBy: repo.actor.name },
        call: () => repo.archive(t.id),
        retry: () => void actions.archive(t, msgs),
      });
    },

    restore(t: WorkItem, msgs: Messages = {}) {
      return run({ success: `Restored ${refOf(t)} “${t.title}”`, ...msgs, itemId: t.id, set: { archivedAt: undefined, archivedBy: undefined }, call: () => repo.restore(t.id), retry: () => void actions.restore(t, msgs) });
    },
  };
  return actions;
}

/** An item's parts: what it waits on, its tags, its subtasks and its comments. */
function partActions(repo: WorkRepository) {
  const side = sideOf(repo.actor);

  const actions = {
    addDependency(t: WorkItem, on: WorkItem, msgs: Messages = {}) {
      return run({ announce: `${refOf(t)} now waits on ${refOf(on)}`, ...msgs, itemId: t.id, set: { dependsOn: [...t.dependsOn, on.id] }, call: () => repo.addDependency(t.id, on.id) });
    },

    removeDependency(t: WorkItem, onId: string, msgs: Messages = {}) {
      return run({ ...msgs, itemId: t.id, set: { dependsOn: t.dependsOn.filter((x) => x !== onId) }, call: () => repo.removeDependency(t.id, onId) });
    },

    addTag(t: WorkItem, raw: string, msgs: Messages = {}) {
      const tag = normalizeTag(raw);
      return run({ ...msgs, itemId: t.id, set: tag && !t.tags.includes(tag) ? { tags: [...t.tags, tag] } : undefined, call: () => repo.addTag(t.id, raw) });
    },

    /** A tag's colour, for the whole contract. Nothing to show optimistically: it lands with the save. */
    setTagColor(t: WorkItem, tag: string, color: TagColor, msgs: Messages = {}) {
      return run({ announce: `Tag “${tag}” is now ${TAG_COLORS[color].label.toLowerCase()}`, ...msgs, itemId: t.id, call: () => repo.setTagColor(t.id, tag, color) });
    },
    removeTag(t: WorkItem, tag: string, msgs: Messages = {}) {
      return run({ ...msgs, itemId: t.id, set: { tags: t.tags.filter((x) => x !== tag) }, call: () => repo.removeTag(t.id, tag) });
    },

    addSubtask(t: WorkItem, title: string, msgs: Messages = {}) {
      const sub = { id: newId("s"), title: title.trim(), done: false };
      return run({ ...msgs, itemId: t.id, set: { subtasks: [...t.subtasks, sub] }, call: () => repo.addSubtask(t.id, sub), retry: () => void actions.addSubtask(t, title, msgs) });
    },

    toggleSubtask(t: WorkItem, subId: string, done: boolean, msgs: Messages = {}) {
      return run({ ...msgs, itemId: t.id, set: { subtasks: t.subtasks.map((s) => (s.id === subId ? { ...s, done } : s)) }, call: () => repo.toggleSubtask(t.id, subId, done) });
    },

    removeSubtask(t: WorkItem, subId: string, msgs: Messages = {}) {
      return run({ ...msgs, itemId: t.id, set: { subtasks: t.subtasks.filter((s) => s.id !== subId) }, call: () => repo.removeSubtask(t.id, subId) });
    },

    comment(t: WorkItem, text: string, msgs: Messages = {}) {
      const c = { id: newId("c"), ts: Date.now(), at: momentLabel(), side: side ?? "team", name: repo.actor.name, text: text.trim() };
      return run({ ...msgs, itemId: t.id, set: { comments: [...t.comments, c] }, call: () => repo.comment(t.id, { id: c.id, text }), retry: () => void actions.comment(t, text, msgs) });
    },
  };
  return actions;
}

/**
 * TB-148 — projects. They change no item, so nothing is shown before it's saved; they queue on
 * their own key, one after another, like an item's changes.
 */
function projectActions(repo: WorkRepository) {
  const actions = {
    createProject(name: string, msgs: Messages = {}, id = newId("p")): Promise<string | null> {
      return run({ success: `Added the project “${name.trim()}”`, ...msgs, itemId: `project:${id}`, call: () => repo.createProject({ id, name }), retry: () => void actions.createProject(name, msgs, id) }).then((ok) => (ok ? id : null));
    },
    renameProject(p: WorkProject, name: string, msgs: Messages = {}) {
      return run({ announce: `Renamed “${p.name}” to “${name.trim()}”`, ...msgs, itemId: `project:${p.id}`, call: () => repo.renameProject(p.id, name) });
    },
    finishProject(p: WorkProject, msgs: Messages = {}) {
      return run({ success: `Finished “${p.name}” — it's out of the open work, and its items are kept`, undo: { label: "Reopen", run: () => void actions.reopenProject(p) }, ...msgs, itemId: `project:${p.id}`, call: () => repo.finishProject(p.id) });
    },
    archiveProject(p: WorkProject, msgs: Messages = {}) {
      return run({ success: `Archived “${p.name}” — it's under Archived in the project list`, undo: { label: "Undo", run: () => void actions.unarchiveProject(p, { announce: `Unarchived “${p.name}”` }) }, ...msgs, itemId: `project:${p.id}`, call: () => repo.archiveProject(p.id) });
    },
    unarchiveProject(p: WorkProject, msgs: Messages = {}) {
      return run({ success: `Unarchived “${p.name}” — it's back under Finished`, ...msgs, itemId: `project:${p.id}`, call: () => repo.unarchiveProject(p.id) });
    },
    /** Resolves true once it's gone. Its items leave the project with the save, so nothing shows before it. */
    deleteProject(p: WorkProject, items: number, msgs: Messages = {}) {
      return run({ success: items ? `Deleted “${p.name}” — its ${items === 1 ? "item is" : `${items} items are`} kept, outside a project` : `Deleted “${p.name}”`, ...msgs, itemId: `project:${p.id}`, call: () => repo.deleteProject(p.id) });
    },
    reopenProject(p: WorkProject, msgs: Messages = {}) {
      return run({ success: `Reopened “${p.name}”`, ...msgs, itemId: `project:${p.id}`, call: () => repo.reopenProject(p.id) });
    },
  };
  return actions;
}

/** Every change the UI can make, run as the repository's person. */
function makeActions(repo: WorkRepository) {
  return { repo, ...itemActions(repo), ...archiveActions(repo), ...partActions(repo), ...projectActions(repo) };
}

export type WorkActions = ReturnType<typeof makeActions>;

export function useWorkActions(actor: Actor, names: Names): WorkActions {
  const { role, name } = actor;
  const { team, independent } = names;
  return useMemo(() => makeActions(repositoryFor({ role, name }, { team, independent })), [role, name, team, independent]);
}
