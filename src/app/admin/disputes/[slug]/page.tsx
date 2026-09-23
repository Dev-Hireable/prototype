"use client";

import { notFound } from "next/navigation";
import { use, useEffect, useState } from "react";
import { AdminPage, Button, Card, DataTable, StatCard, StatGrid } from "@/components/admin/ui";
import { BreadcrumbBack } from "@/components/portal/nav";
import { Button as DialogButton, Field, Modal, Select as FormSelect, Textarea, Toast, useToast } from "@/components/independent/ui";
import { isPast } from "@/lib/demo/dates";
import { useDeal } from "@/lib/demo/deal";
import {
  ageOf,
  contractName,
  dateOf,
  daysOpen,
  dealContract,
  escrowOf,
  factsFor,
  holds,
  markAdminSeen,
  otherParty,
  outcomeOf,
  partyName,
  rateAmount,
  rejectDispute,
  releasePayment,
  requestEvidence,
  resolveDispute,
  SLA_DAYS,
  stampOf,
  usd,
  useDisputes,
} from "@/lib/demo/disputes";
import type { DisputeEvent, DisputeParty } from "@/lib/demo/disputes";

type Check = { check: string; result: string; source: string };
type Dialog = "evidence" | "reject" | "resolve" | "release";

/**
 * AD-033 / AD-034 / AD-035 — one dispute, with everything needed to rule on it: what was filed,
 * the process check, what each side has said since, and the timeline. Request evidence, Reject,
 * Resolve and Request payment release all act on the shared record, so both parties see the
 * outcome on their own side. The Figma version was a static page whose buttons did nothing.
 */
export default function DisputeDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const all = useDisputes();
  const deal = useDeal();
  const d = all.find((x) => x.id === slug);
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [notes, setNotes] = useState("");
  const [favor, setFavor] = useState<DisputeParty | null>(null);
  const [from, setFrom] = useState<DisputeParty | "both">("both");
  const [toast, setToast] = useToast();

  // Opening it is what clears the "New" badge on the list and the nav.
  const id = d?.id;
  const updated = d?.updated;
  useEffect(() => {
    if (id) markAdminSeen(id);
  }, [id, updated]);
  if (!d) notFound();

  const other = otherParty(d.filedBy);
  const roleOf = (p: DisputeParty) => (p === "team" ? "team builder" : "independent");
  const onLiveContract = dealContract(deal)?.key === d.contract;
  const facts = onLiveContract ? factsFor({ key: d.contract, links: d.links, title: d.title, type: d.type, rate: d.rate, started: d.facts.started, ends: d.facts.ends }, deal, all) : d.facts;
  const held = onLiveContract ? (escrowOf(deal, all)?.held ?? 0) : d.facts.escrowHeld;
  const refundable = Math.min(d.amount, held);
  const outcome = outcomeOf(d);
  const close = () => {
    setDialog(null);
    setNotes("");
    setFavor(null);
    setFrom("both");
  };

  /** AD-033 — Hireable checks the process, not the work: each row is a fact on file. */
  const checks: Check[] = [
    d.type === "trial"
      ? // A trial closes on its end date, or earlier once every objective is approved.
        { check: "Trial has ended", result: facts.trialEnded ? (isPast(facts.ends) ? `Pass — ended ${facts.ends}` : `Pass — every objective approved ahead of ${facts.ends}`) : `Fail — runs until ${facts.ends}`, source: "contract" }
      : { check: "Full-time contract is active", result: `Pass — since ${facts.started}`, source: "contract" },
    { check: "Evaluation submitted by employer", result: facts.evaluation ? "Pass — submitted" : "Fail — not submitted", source: "trial dashboard" },
    { check: "Objectives approved", result: facts.objectivesTotal ? `${facts.objectivesDone} of ${facts.objectivesTotal} approved` : "No objectives on record", source: "objective log" },
    ...(d.type === "trial"
      ? [
          // What was actually deposited — it printed the rate string, so an edited offer "funded" money nobody paid.
          { check: "Escrow funded at offer", result: `Pass — ${usd(facts.escrowFunded ?? rateAmount(d.rate))} deposited ${facts.started}`, source: "payments" },
          { check: "Amount in question within escrow", result: d.amount <= d.facts.escrowHeld ? `Pass — ${usd(d.amount)} of ${usd(d.facts.escrowHeld)} held when filed` : `Check — more than the ${usd(d.facts.escrowHeld)} held`, source: "payments" },
        ]
      : []),
  ];

  const pending = d.status === "Pending";
  const awaitingRelease = d.resolution?.payment === "awaiting release";

  return (
    <AdminPage
      nav={<BreadcrumbBack href="/admin/disputes">Back to all disputes</BreadcrumbBack>}
      title={`${d.reason} · ${d.title}`}
      actions={
        pending ? (
          <>
            <Button onClick={() => setDialog("evidence")}>Request evidence</Button>
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
            sub={holds(d) ? "held in escrow" : d.resolution?.payment === "refunded" ? "refunded to the team builder" : d.resolution?.payment === "released" ? "released to the independent" : "hold lifted"}
          />
          <StatCard label="Age" value={ageOf(d)} sub={pending ? (daysOpen(d) > SLA_DAYS ? `past the ${SLA_DAYS}-day SLA` : `SLA ${SLA_DAYS} days`) : `closed ${dateOf(d.resolution?.at ?? d.updated)}`} />
        </StatGrid>

        <Card className="flex flex-col gap-3 p-5 text-[13px] leading-[1.45]">
          <h2 className="text-[14px] font-semibold text-ink-deep">What was filed</h2>
          <dl className="flex flex-col gap-2">
            {(
              [
                ["Contract", contractName(d)],
                ["Date filed", dateOf(d.at)],
                ["Reason", d.reason],
                ["Supporting evidence", d.evidence ?? "None attached"],
                ["Status", d.status],
              ] as const
            ).map(([k, v]) => (
              <div key={k} className="flex gap-4">
                <dt className="w-[160px] shrink-0 text-muted">{k}</dt>
                <dd className="min-w-0 flex-1 break-words text-ink-deep">{v}</dd>
              </div>
            ))}
          </dl>
          <p className="rounded-lg bg-surface-alt p-4 text-[14px] text-ink-deep">{d.description}</p>
          {d.evidenceRequest && pending && (
            <p className="text-muted">
              Evidence requested from {d.evidenceRequest.from === "both" ? "both parties" : partyName(d, d.evidenceRequest.from)} on {stampOf(d.evidenceRequest.at)}: {d.evidenceRequest.note}
            </p>
          )}
        </Card>

        {outcome && (
          <Card className="flex flex-col gap-2 p-5 text-[13px] leading-[1.45]">
            <h2 className="text-[14px] font-semibold text-ink-deep">{outcome}</h2>
            <p className="text-muted">{d.resolution?.notes}</p>
          </Card>
        )}

        <DataTable<Check>
          caption="Process check — Hireable reviews compliance, not work quality"
          rows={checks}
          columns={[
            { header: "Check", cell: (c) => c.check },
            { header: "Result", cell: (c) => c.result, width: "34%" },
            { header: "Source", cell: (c) => c.source, width: "18%" },
          ]}
        />

        {/* AD-033 — "messages between parties": what each side has added since filing. */}
        <Card className="flex flex-col gap-3 p-5 text-[13px] leading-[1.45]">
          <h2 className="text-[14px] font-semibold text-ink-deep">Statements from the parties</h2>
          {d.statements.length === 0 ? (
            <p className="text-muted">Neither party has added anything since the dispute was filed.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {d.statements.map((s) => (
                <li key={s.at} className="flex flex-col gap-1 rounded-lg p-3 outline -outline-offset-1 outline-line">
                  <p className="text-[12px] text-muted">
                    {partyName(d, s.from)} ({roleOf(s.from)}) · {stampOf(s.at)}
                  </p>
                  <p className="text-ink-deep">{s.text}</p>
                  {s.evidence && <p className="break-words text-accent">Evidence: {s.evidence}</p>}
                </li>
              ))}
            </ul>
          )}
        </Card>

        <DataTable<DisputeEvent>
          caption="Timeline"
          rows={d.timeline}
          columns={[
            { header: "Event", cell: (e) => e.event },
            { header: "Actor", cell: (e) => e.actor, width: "22%" },
            { header: "When", cell: (e) => stampOf(e.at), width: "22%" },
          ]}
        />
      </div>

      {/* AD-033 — the request lands on the dispute and in the named party's notifications. */}
      <Modal
        open={dialog === "evidence"}
        onClose={close}
        title="Request evidence"
        description="The party sees this on the dispute, with a notification, and can reply with a statement and a link."
        footer={
          <>
            <DialogButton size="lg" onClick={close}>
              Cancel
            </DialogButton>
            <DialogButton
              size="lg"
              variant="primary"
              disabled={!notes.trim()}
              onClick={() => {
                requestEvidence(d.id, from, notes);
                close();
                setToast(`Evidence requested from ${from === "both" ? "both parties" : partyName(d, from)}`);
              }}
            >
              Send request
            </DialogButton>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <Field label="Ask">
            <FormSelect
              options={["Both parties", `${d.team.company} (team builder)`, `${d.independent.name} (independent)`]}
              value={from === "both" ? "Both parties" : from === "team" ? `${d.team.company} (team builder)` : `${d.independent.name} (independent)`}
              onChange={(e) => setFrom(e.target.value === "Both parties" ? "both" : e.target.value.startsWith(d.team.company) ? "team" : "independent")}
            />
          </Field>
          <Field label="What do you need?">
            <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="The report behind objective 3, the message where the deadline moved…" />
          </Field>
        </div>
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
            <DialogButton
              size="lg"
              variant="danger"
              disabled={!notes.trim()}
              onClick={() => {
                rejectDispute(d.id, notes);
                close();
                setToast("Dispute rejected — both parties have been notified");
              }}
            >
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
              onClick={() => {
                if (!favor) return;
                resolveDispute(d.id, favor, notes);
                close();
                setToast(favor === "team" ? `Resolved — ${usd(refundable)} refunded to ${d.team.company}` : `Resolved for ${d.independent.name} — request the payment release to pay it out`);
              }}
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
            <FormSelect
              options={["Select a party", `${d.team.company} (team builder)`, `${d.independent.name} (independent)`]}
              value={favor === "team" ? `${d.team.company} (team builder)` : favor === "independent" ? `${d.independent.name} (independent)` : "Select a party"}
              onChange={(e) => setFavor(e.target.value === "Select a party" ? null : e.target.value.startsWith(d.team.company) ? "team" : "independent")}
            />
          </Field>
          <Field label="Resolution notes" hint="Required. Both parties read these.">
            <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Which checks decided it, and why" />
          </Field>
        </div>
      </Modal>

      {/* AD-035 — the release, confirmed, on a dispute resolved for the independent. */}
      <Modal
        open={dialog === "release"}
        onClose={close}
        title="Request payment release?"
        description={`${usd(Math.min(d.amount, held))} is released from the ${d.title} escrow to ${d.independent.name}, and both parties are told.`}
        footer={
          <>
            <DialogButton size="lg" onClick={close}>
              Cancel
            </DialogButton>
            <DialogButton
              size="lg"
              variant="primary"
              onClick={() => {
                releasePayment(d.id);
                close();
                setToast(`Payment released to ${d.independent.name}`);
              }}
            >
              Release payment
            </DialogButton>
          </>
        }
      />
      <Toast message={toast} onClose={() => setToast(null)} />
    </AdminPage>
  );
}
