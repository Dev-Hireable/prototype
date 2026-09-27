"use client";

import { useCallback, useMemo, useState } from "react";
import type { DraftStart } from "@/components/agreement/draft";
import { useAgreement } from "@/lib/work/deal-scope";
import { newId } from "@/lib/work/model";
import { sideOf, type Actor, type Names, type WorkAccess } from "@/lib/work/permissions";
import { useAgreementActions } from "@/lib/work/store";
import type { WorkspaceAgreement } from "./context";

/** Why this person can't propose a change to the contract from the work right now, or null. */
function blockOf(actor: Actor, access: WorkAccess, open: { number: number } | undefined, hasVersion: boolean): string | null {
  if (!sideOf(actor)) return "Admins can see the contract but can't change it.";
  if (!hasVersion) return "This contract has no agreed version yet.";
  if (!access.open) return access.trialClosed ? "The trial is over, so what was agreed for it is final." : (access.closedReason ?? "This contract isn't taking changes.");
  if (open) return `Amendment ${open.number} is open — it's settled on the Agreement tab before another is proposed.`;
  return null;
}

/**
 * The agreement as the work tab uses it: which contract tasks the open amendment would change (their
 * cards and sheets say so), whether a change can be proposed, and the builder that proposes one —
 * opened from the header, a task's sheet or its menu. A task's sheet closes first, so the builder
 * isn't a dialog over a dialog.
 */
export function useWorkspaceAgreement(actor: Actor, names: Names, access: WorkAccess, closeTask: () => void) {
  const { scope, current, open, items } = useAgreement();
  const actions = useAgreementActions(actor, names);
  const [builder, setBuilder] = useState<{ key: string; start?: DraftStart } | null>(null);
  const side = sideOf(actor);
  const blocked = blockOf(actor, access, open, !!current);
  const propose = useCallback(
    (start?: DraftStart) => {
      closeTask();
      setBuilder({ key: newId("b"), start });
    },
    [closeTask],
  );
  const pending = useMemo(() => new Map((open?.changes ?? []).flatMap((c) => (c.kind === "change" || c.kind === "remove" ? [[c.taskId, c.kind] as const] : []))), [open]);
  const summary = useMemo(() => (open ? { number: open.number, by: open.by, byName: open.byName, waiting: open.status === "pending" ? open.by !== side : open.by === side } : null), [open, side]);
  const agreement = useMemo<WorkspaceAgreement>(() => ({ pending, open: summary, blocked, propose }), [pending, summary, blocked, propose]);
  const counterpart = side === "team" ? names.independent : names.team;
  const shown = builder && current && scope ? { key: builder.key, start: builder.start, base: current, items, access, actions, counterpart, onClose: () => setBuilder(null) } : null;
  return { agreement, builder: shown };
}
