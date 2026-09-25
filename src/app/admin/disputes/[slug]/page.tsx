"use client";

import Link from "next/link";
import { notFound } from "next/navigation";
import { use, useEffect, useState } from "react";
import { AdminPage, Button, DataTable, StatCard, StatGrid } from "@/components/admin/ui";
import { ICONS } from "@/components/admin/icons";
import { Button as DialogButton, Field, Modal, Select as FormSelect, Textarea, Toast, useToast } from "@/components/independent/ui";
import { DisputeCase } from "@/components/portal/DisputeCase";
import { BreadcrumbBack } from "@/components/portal/nav";
import { useWithReturn } from "@/components/portal/return";
import { isPast } from "@/lib/demo/dates";
import { useDeal, useHydrated } from "@/lib/demo/deal";
import { JOB_TYPE_LABEL } from "@/lib/demo/job-types";
import {
  ageOf,
  askParty,
  dateOf,
  daysOpen,
  dealContract,
  escrowInPlay,
  extendDeadline,
  factsFor,
  holds,
  isOpen,
  leftLabel,
  markAdminSeen,
  otherParty,
  partyName,
  partyTurn,
  rateAmount,
  rejectDispute,
  releasePayment,
  resolveDispute,
  SLA_DAYS,
  stampOf,
  TURN_DAYS,
  usd,
  useDisputes,
  waitingOn,
} from "@/lib/demo/disputes";
import type { DisputeParty } from "@/lib/demo/disputes";
import { useNow } from "@/lib/portal/use-now";

type Check = { check: string; result: string; source: string };
type Dialog = "ask" | "extend" | "reject" | "resolve" | "release";

const DAY = 86_400_000;
const EXTEND_BY = [1, 2, 3, 5];

/**
 * AD-033 / AD-034 / AD-035 — one dispute, as support works it: the same case both parties see
 * (whose turn it is, the timeline, the settlement on the table, the money), the process check,
 * and support's own moves — ask one side for more, give someone more time, rule, reject, and pay
 * out a case closed for the Independent. Every move lands on the shared case and tells both sides.
 */
export default function DisputeDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const hydrated = useHydrated();
  const all = useDisputes();
  const deal = useDeal();
  const d = all.find((x) => x.id === slug);
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [notes, setNotes] = useState("");
  const [favor, setFavor] = useState<DisputeParty | null>(null);
  const [who, setWho] = useState<DisputeParty | null>(null);
  const [days, setDays] = useState(2);
  const [toast, setToast] = useToast();
  const withReturn = useWithReturn();
  const now = useNow();

  // Opening it is what clears the "New" badge on the list and the nav.
  const id = d?.id;
  const updated = d?.updated;
  useEffect(() => {
    if (id) markAdminSeen(id);
  }, [id, updated]);
  // Disputes live in this browser's storage — nothing to look up until it has loaded.
  if (!hydrated) return null;
  if (!d) notFound();

  const other = otherParty(d.filedBy);
  const roleOf = (p: DisputeParty) => (p === "team" ? "team builder" : "independent");
  const onLiveContract = dealContract(deal)?.key === d.contract;
  const facts = onLiveContract ? factsFor({ key: d.contract, links: d.links, title: d.title, type: d.type, rate: d.rate, started: d.facts.started, ends: d.facts.ends }, deal, all) : d.facts;
  const tasksDone = facts.tasksDone ?? facts.objectivesDone ?? 0;
  const tasksTotal = facts.tasksTotal ?? facts.objectivesTotal ?? 0;
  /** What a ruling for the company would refund: never more than the live escrow still holds. */
  const cap = onLiveContract ? escrowInPlay(deal, all)?.held : undefined;
  const refundable = Math.min(d.amount, cap ?? d.amount);
  const turn = partyTurn(d);
  const waiting = waitingOn(d);
  const open = isOpen(d);
  const awaitingRelease = d.resolution?.payment === "awaiting release";
  const close = () => {
    setDialog(null);
    setNotes("");
    setFavor(null);
    setWho(null);
    setDays(2);
  };
  const done = (r: { ok: boolean; error?: string }, message: string) => {
    close();
    setToast(r.ok ? message : (r.error ?? "That didn't work — try again."));
  };
  const partyOption = (p: DisputeParty) => `${partyName(d, p)} (${roleOf(p)})`;
  const pick = (value: string): DisputeParty | null => (value === partyOption("team") ? "team" : value === partyOption("independent") ? "independent" : null);

  /** AD-033 — Hireable checks the process, not the work: each row is a fact on file. */
  const checks: Check[] = [
    d.type === "trial"
      ? // A trial closes on its end date, or earlier once every trial task is Done.
        { check: "Trial has ended", result: facts.trialEnded ? (isPast(facts.ends) ? `Pass — ended ${facts.ends}` : `Pass — every task approved ahead of ${facts.ends}`) : `Fail — runs until ${facts.ends}`, source: "contract" }
      : { check: `${JOB_TYPE_LABEL[d.type]} contract is active`, result: `Pass — since ${facts.started}`, source: "contract" },
    { check: "Evaluation submitted by employer", result: facts.evaluation ? "Pass — submitted" : "Fail — not submitted", source: "trial dashboard" },
    { check: "Tasks approved", result: tasksTotal ? `${tasksDone} of ${tasksTotal} approved` : "No tasks on record", source: "task log" },
    ...(d.type === "trial"
      ? [
          { check: "Escrow funded at offer", result: `Pass — ${usd(facts.escrowFunded ?? rateAmount(d.rate))} deposited ${facts.started}`, source: "payments" },
          { check: "Amount in question within escrow", result: d.amount <= d.facts.escrowHeld ? `Pass — ${usd(d.amount)} of ${usd(d.facts.escrowHeld)} held when filed` : `Check — more than the ${usd(d.facts.escrowHeld)} held`, source: "payments" },
        ]
      : []),
  ];

  return (
    <AdminPage
      nav={<BreadcrumbBack href="/admin/disputes">Back to all disputes</BreadcrumbBack>}
      title={`${d.reason} · ${d.title}`}
      actions={
        open ? (
          <>
            {/* One side at a time: asking hands them the turn, with its own deadline. */}
            {!turn && <Button onClick={() => setDialog("ask")}>Ask a party</Button>}
            {turn && <Button onClick={() => setDialog("extend")}>Extend deadline</Button>}
            <Button variant="danger" onClick={() => setDialog("reject")}>
              Reject
            </Button>
            <Button variant="primary" onClick={() => setDialog("resolve")}>
              Resolve
            </Button>
          </>
        ) : awaitingRelease ? (
          <Button variant="primary" onClick={() => setDialog("release")}>
            Request payment release
          </Button>
        ) : undefined
      }
    >
      <div className="flex flex-col gap-4">
        <StatGrid>
          <StatCard label="Raised by" value={partyName(d, d.filedBy)} sub={roleOf(d.filedBy)} />
          <StatCard label="Against" value={partyName(d, other)} sub={roleOf(other)} />
          <StatCard
            label="Amount in question"
            value={usd(d.amount)}
            sub={holds(d) ? "held in escrow" : d.resolution?.payment === "refunded" ? "refunded to the team builder" : d.resolution?.payment === "released" ? "released to the independent" : d.resolution?.payment === "split" ? "split by agreement" : "hold lifted"}
          />
          <StatCard
            label="Waiting on"
            value={waiting === "support" ? "You" : waiting ? partyName(d, waiting) : "Nobody"}
            sub={turn ? leftLabel(turn.due, now).toLowerCase() : open ? (daysOpen(d) > SLA_DAYS ? `open ${ageOf(d)} · past the ${SLA_DAYS}-day SLA` : `open ${ageOf(d)} · SLA ${SLA_DAYS} days`) : `closed ${dateOf(d.resolution?.at ?? d.updated)}`}
          />
        </StatGrid>

        <DisputeCase dispute={d} viewer="admin" onToast={setToast} />

        <DataTable<Check>
          caption="Process check — Hireable reviews compliance, not work quality"
          rows={checks}
          columns={[
            { header: "Check", cell: (c) => c.check },
            { header: "Result", cell: (c) => c.result, width: "34%" },
            { header: "Source", cell: (c) => c.source, width: "18%" },
          ]}
        />
        {/* AD-050 — the task log the process check reads, as both parties see it (read-only). */}
        {onLiveContract && (
          <Link href={withReturn(`/admin/contracts/${d.links.independent}`)} className="inline-flex items-center gap-1.5 self-start text-[13px] font-semibold text-accent hover:underline">
            Open the contract&apos;s work <ICONS.northEast size={16} aria-hidden />
          </Link>
        )}
      </div>

      {/* AD-033 — a question for one side, who then has five days to answer on the case. */}
      <Modal
        open={dialog === "ask"}
        onClose={close}
        title="Ask a party for more"
        description={`They see your question on the case, with a notification, and have ${TURN_DAYS} days to answer. If they don't, the dispute closes in the other side's favor.`}
        footer={
          <>
            <DialogButton size="lg" onClick={close}>
              Cancel
            </DialogButton>
            <DialogButton size="lg" variant="primary" disabled={!who || !notes.trim()} onClick={async () => who && done(await askParty(d.id, who, notes), `Asked ${partyName(d, who)} — they have ${TURN_DAYS} days to answer`)}>
              Send question
            </DialogButton>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <Field label="Ask">
            <FormSelect options={["Select a party", partyOption("team"), partyOption("independent")]} value={who ? partyOption(who) : "Select a party"} onChange={(e) => setWho(pick(e.target.value))} />
          </Field>
          <Field label="What do you need?">
            <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="The report behind task 3, the message where the deadline moved…" />
          </Field>
        </div>
      </Modal>

      {/* Support can give whoever's on the clock more time — before it runs out, never after. */}
      <Modal
        open={dialog === "extend" && !!turn}
        onClose={close}
        title="Extend the deadline"
        description={turn ? `${partyName(d, turn.who)} has until ${stampOf(turn.due)} to respond. Both sides are told about the new deadline.` : undefined}
        footer={
          <>
            <DialogButton size="lg" onClick={close}>
              Cancel
            </DialogButton>
            <DialogButton size="lg" variant="primary" onClick={async () => turn && done(await extendDeadline(d.id, days), `${partyName(d, turn.who)} now has until ${stampOf(turn.due + days * DAY)}`)}>
              Extend deadline
            </DialogButton>
          </>
        }
      >
        <Field label="Give them" hint={turn ? `New deadline: ${stampOf(turn.due + days * DAY)}` : undefined}>
          <FormSelect options={EXTEND_BY.map((n) => `${n} more ${n === 1 ? "day" : "days"}`)} value={`${days} more ${days === 1 ? "day" : "days"}`} onChange={(e) => setDays(Number(e.target.value.split(" ")[0]))} />
        </Field>
      </Modal>

      <Modal
        open={dialog === "reject"}
        onClose={close}
        tone="danger"
        title="Reject this dispute?"
        description={`Use this when the agreed process was followed, so neither side is ruled for. The ${usd(d.amount)} hold on the escrow is lifted and both parties are told.`}
        footer={
          <>
            <DialogButton size="lg" onClick={close}>
              Cancel
            </DialogButton>
            <DialogButton size="lg" variant="danger" disabled={!notes.trim()} onClick={async () => done(await rejectDispute(d.id, notes), "Dispute rejected — both parties have been notified")}>
              Reject dispute
            </DialogButton>
          </>
        }
      >
        <Field label="Resolution notes" hint="Required. Both parties read these.">
          <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="What the process check found" />
        </Field>
      </Modal>

      {/* AD-034 — a ruling for one side, with notes, and the payment action it triggers. */}
      <Modal
        open={dialog === "resolve"}
        onClose={close}
        title="Resolve this dispute"
        description="Rule in favor of one party. Both are notified with your notes, and the escrow moves with the ruling."
        footer={
          <>
            <DialogButton size="lg" onClick={close}>
              Cancel
            </DialogButton>
            <DialogButton
              size="lg"
              variant="primary"
              disabled={!favor || !notes.trim()}
              onClick={async () => favor && done(await resolveDispute(d.id, favor, notes), favor === "team" ? `Resolved — ${usd(refundable)} refunded to ${d.team.company}` : `Resolved for ${d.independent.name} — request the payment release to pay it out`)}
            >
              Resolve dispute
            </DialogButton>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <Field
            label="Rule in favor of"
            hint={
              favor === "team"
                ? `${usd(refundable)} is refunded to ${d.team.company} from escrow straight away.`
                : favor === "independent"
                  ? `${usd(d.amount)} is released to ${d.independent.name} once you request the payment release.`
                  : "Choose the party the process check supports."
            }
          >
            <FormSelect options={["Select a party", partyOption("team"), partyOption("independent")]} value={favor ? partyOption(favor) : "Select a party"} onChange={(e) => setFavor(pick(e.target.value))} />
          </Field>
          <Field label="Resolution notes" hint="Required. Both parties read these.">
            <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Which checks decided it, and why" />
          </Field>
        </div>
      </Modal>

      {/* AD-035 — the release, confirmed, on a case closed for the independent. */}
      <Modal
        open={dialog === "release"}
        onClose={close}
        title="Request payment release?"
        description={`${usd(Math.min(d.amount, cap ?? d.amount))} is released from the ${d.title} escrow to ${d.independent.name}, and both parties are told.`}
        footer={
          <>
            <DialogButton size="lg" onClick={close}>
              Cancel
            </DialogButton>
            <DialogButton size="lg" variant="primary" onClick={async () => done(await releasePayment(d.id), `Payment released to ${d.independent.name}`)}>
              Release payment
            </DialogButton>
          </>
        }
      />
      <Toast message={toast} onClose={() => setToast(null)} />
    </AdminPage>
  );
}
