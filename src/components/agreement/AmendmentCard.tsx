"use client";

import { useState } from "react";
import { Button, Card } from "@/components/independent/ui";
import { Badge } from "@/components/portal/Badge";
import { Callout } from "@/components/portal/Callout";
import type { Side, WorkItem } from "@/lib/work/model";
import type { Names } from "@/lib/work/permissions";
import { amendmentMoves, resolveChanges, type Amendment, type ContractVersion } from "@/lib/work/scope";
import type { AgreementActions } from "@/lib/work/store";
import { AmendmentChanges } from "./AmendmentChanges";
import { AcceptAmendment, AnswerAmendment } from "./AmendmentDialogs";

type CardProps = {
  amendment: Amendment;
  base: ContractVersion;
  items: ReadonlyMap<string, WorkItem>;
  /** The reader's side; none for an admin, who reads it only. */
  side: Side | null;
  names: Names;
  /** The contract takes amendments now. */
  open: boolean;
  actions: AgreementActions;
  onRevise: () => void;
  onToast: (message: string, tone?: "success" | "danger") => void;
};

/** Where it stands, for this reader: waiting on them, on the other side, or back with its proposer. */
function standing(a: Amendment, side: Side | null, names: Names): { label: string; tone: "warn" | "info" | "neutral" } {
  const other = a.by === "team" ? names.independent : names.team;
  if (a.status === "changes_requested") return a.by === side ? { label: `${a.answer?.name.split(" ")[0] ?? other} asked for changes`, tone: "warn" } : { label: `Back with ${a.byName.split(" ")[0]}`, tone: "neutral" };
  if (!side) return { label: `Waiting on ${other}`, tone: "info" };
  return a.by === side ? { label: `Waiting on ${other}`, tone: "info" } : { label: "Waiting on you", tone: "warn" };
}

/**
 * The revision the reader has in front of them: one the proposer sends while they read makes it
 * `stale`, and their answer names the one they read — so it's refused, not applied unread.
 */
function useSeen(revision: number) {
  const [seen, setSeen] = useState(revision);
  return { seen, stale: seen !== revision, catchUp: () => setSeen(revision) };
}

/**
 * The open amendment: who proposed it and why, where it stands, every change before and after —
 * and what this reader can do: accept it (the next version), ask for changes, reject it, or, as its
 * proposer, revise or withdraw it.
 */
export function AmendmentCard({ amendment: a, base, items, side, names, open, actions, onRevise, onToast }: CardProps) {
  const [dialog, setDialog] = useState<null | "accept" | "reject" | "askChanges">(null);
  const { seen, stale, catchUp } = useSeen(a.revision);
  const moves = amendmentMoves(a, side, open);
  const s = standing(a, side, names);
  const done = (r: { ok: true } | { ok: false; error: string }, message: string) => {
    setDialog(null);
    onToast(r.ok ? message : r.error, r.ok ? "success" : "danger");
  };
  const who = a.byName.split(" ")[0];
  return (
    <Card className="flex flex-col gap-4 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <h3 className="text-[16px] leading-[1.4] font-semibold text-ink">Amendment {a.number}</h3>
          <p className="text-[12.5px] leading-[1.4] text-ink-2">
            Proposed by {a.byName} · {a.proposedAt}
            {a.revision > 1 ? ` · revision ${a.revision}` : ""} · to contract v{a.base}
          </p>
        </div>
        <Badge tone={s.tone}>{s.label}</Badge>
      </div>
      {stale && (
        <Callout tone="warn" action={<Button size="sm" onClick={catchUp}>Read revision {a.revision}</Button>}>
          {who} revised it while you were reading revision {seen}.
        </Callout>
      )}
      <p className="text-[14px] leading-[1.45] whitespace-pre-line text-ink [overflow-wrap:anywhere]">“{a.reason}”</p>
      {a.status === "changes_requested" && a.answer?.note && (
        <Callout tone="warn">
          {a.answer.name.split(" ")[0]} asked for changes: “{a.answer.note}”
        </Callout>
      )}
      <AmendmentChanges changes={resolveChanges(base, a.changes)} items={items} label={`Changes in Amendment ${a.number}`} />
      <Moves moves={moves} stale={stale} onDialog={setDialog} onRevise={onRevise} onWithdraw={async () => done(await actions.withdraw(a.id, a.revision), `Amendment ${a.number} withdrawn`)} />
      {dialog === "accept" && <AcceptAmendment open amendment={a} base={base} items={items} onClose={() => setDialog(null)} onAccept={async () => done(await actions.accept(a.id, { revision: seen }), `Accepted — the contract is v${base.version + 1} now`)} />}
      {(dialog === "reject" || dialog === "askChanges") && <AnswerAmendment open kind={dialog} amendment={a} onClose={() => setDialog(null)} onSend={async (note) => done(await (dialog === "reject" ? actions.reject : actions.askChanges)(a.id, { revision: seen, note }), dialog === "reject" ? `Amendment ${a.number} rejected — ${who} has been told` : `Sent back to ${who} with your note`)} />}
    </Card>
  );
}

/** The buttons this reader has: Accept, Ask for changes and Reject — or, as its proposer, Revise and Withdraw. */
function Moves({ moves, stale, onDialog, onRevise, onWithdraw }: { moves: ReturnType<typeof amendmentMoves>; stale: boolean; onDialog: (d: "accept" | "reject" | "askChanges") => void; onRevise: () => void; onWithdraw: () => void }) {
  if (!moves.length) return null;
  return (
    <div className="flex flex-wrap justify-end gap-2 border-t border-[#eeeeee] pt-4">
      {moves.includes("withdraw") && (
        <Button size="md" variant="ghost" onClick={onWithdraw}>
          Withdraw
        </Button>
      )}
      {moves.includes("revise") && (
        <Button size="md" onClick={onRevise}>
          Revise
        </Button>
      )}
      {moves.includes("reject") && (
        <Button size="md" variant="ghost" onClick={() => onDialog("reject")}>
          Reject
        </Button>
      )}
      {moves.includes("askChanges") && (
        <Button size="md" onClick={() => onDialog("askChanges")}>
          Ask for changes
        </Button>
      )}
      {moves.includes("accept") && (
        <Button size="md" variant="primary" disabled={stale} onClick={() => onDialog("accept")}>
          Accept…
        </Button>
      )}
    </div>
  );
}
