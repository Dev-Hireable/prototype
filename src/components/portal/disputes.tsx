"use client";

import { useSearchParams } from "next/navigation";
import { useState, type ReactNode } from "react";
import { Button, EmptyState, Field, Input, Modal, Page, SearchBox, Select, StatusDot, Tabs, Textarea, Toast, useToast } from "@/components/independent/ui";
import { Person, Row, Table, Toolbar } from "@/components/team/ui";
import { addStatement, checkAmount, contractName, dateOf, DISPUTE_REASONS, DISPUTE_STATUSES, otherParty, outcomeOf, partyName, SLA_DAYS, stampOf, STATUS_TONE, usd, useDisputes, withdrawDispute } from "@/lib/demo/disputes";
import type { Dispute, DisputeParty } from "@/lib/demo/disputes";
import { PAIR } from "@/lib/demo/live";
import { useQueryState } from "@/lib/portal/query-state";

/**
 * The dispute screens both portals share, so the Team Builder and the Independent file, read,
 * answer and withdraw a dispute the same way. `side` is whose portal it is.
 */

const REASON_PROMPT = "Select a reason";

export type DisputeDraft = { reason: string; description: string; amount: number; evidence?: string };

/**
 * TB-073 / TB-118 / IN-059 — reason, description and amount are required; evidence is optional.
 * No reason is preselected (it used to arrive as "Missing Deliverable" without being chosen), and
 * the amount has to be a positive sum no bigger than `cap`.
 */
export function DisputeForm({ open, onClose, title, description, cap, capNote, onFile }: { open: boolean; onClose: () => void; title: string; description: string; cap: number; capNote: string; onFile: (d: DisputeDraft) => void }) {
  const [reason, setReason] = useState("");
  const [text, setText] = useState("");
  const [amount, setAmount] = useState("");
  const [evidence, setEvidence] = useState("");
  const [touched, setTouched] = useState(false);
  const checked = checkAmount(amount, cap);
  const ready = !!reason && !!text.trim() && checked.value !== null;
  const reset = () => {
    setReason("");
    setText("");
    setAmount("");
    setEvidence("");
    setTouched(false);
  };
  const close = () => {
    reset();
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title={title}
      description={description}
      footer={
        <>
          <Button size="lg" onClick={close}>
            Cancel
          </Button>
          <Button
            size="lg"
            variant="danger"
            disabled={!ready}
            onClick={() => {
              if (checked.value === null) return;
              onFile({ reason, description: text.trim(), amount: checked.value, evidence: evidence.trim() || undefined });
              reset();
            }}
          >
            File dispute
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <Field label="Reason">
          <Select options={[REASON_PROMPT, ...DISPUTE_REASONS]} value={reason || REASON_PROMPT} onChange={(e) => setReason(e.target.value === REASON_PROMPT ? "" : e.target.value)} />
        </Field>
        <Field label="What happened?">
          <Textarea rows={4} value={text} onChange={(e) => setText(e.target.value)} placeholder="Dates, what was agreed and what happened instead. Support reads this first." />
        </Field>
        {/* The error shows once there is something to judge, not on an untouched field. */}
        <Field label="Amount in question (USD)" hint={`Up to ${usd(cap)} — ${capNote}`} error={touched || amount.trim() ? checked.error : undefined}>
          <Input value={amount} inputMode="decimal" onChange={(e) => setAmount(e.target.value)} onBlur={() => setTouched(true)} placeholder="1,600.00" />
        </Field>
        <Field label="Supporting evidence (optional)">
          <Input value={evidence} onChange={(e) => setEvidence(e.target.value)} placeholder="Link to a document, a report, a thread or a screenshot" />
        </Field>
        {!ready && <p className="text-[12.5px] leading-[1.4] text-ink-2">Choose a reason, say what happened and enter the amount before filing.</p>}
      </div>
    </Modal>
  );
}

/** A labelled block inside the detail view. */
function Section({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-[14px] leading-[1.2] font-semibold tracking-[0.2px] text-ink">{label}</p>
      {children}
    </div>
  );
}

/**
 * TB-092 / IN-081 — everything that was filed, what each side has added since, and the ruling
 * once there is one. Read-only: the footer offers the next step instead of editing in place.
 */
function DisputeDetail({ dispute: d, side, onClose, onRespond, onWithdraw }: { dispute: Dispute | null; side: DisputeParty; onClose: () => void; onRespond: (d: Dispute) => void; onWithdraw: (d: Dispute) => void }) {
  const mine = d?.filedBy === side;
  const pending = d?.status === "Pending";
  const asked = d?.evidenceRequest && pending && (d.evidenceRequest.from === side || d.evidenceRequest.from === "both") ? d.evidenceRequest : null;
  const outcome = d && outcomeOf(d);

  return (
    <Modal
      open={!!d}
      onClose={onClose}
      width={600}
      title={d ? `Dispute · ${contractName(d)}` : ""}
      description={d ? `Filed ${dateOf(d.at)} by ${mine ? "you" : partyName(d, d.filedBy)} · ${usd(d.amount)} · ${d.reason}` : undefined}
      footer={
        d && (
          <>
            <Button size="lg" onClick={onClose}>
              Close
            </Button>
            {pending && mine && (
              <Button size="lg" onClick={() => onWithdraw(d)}>
                Withdraw
              </Button>
            )}
            {pending && (
              <Button size="lg" variant="primary" onClick={() => onRespond(d)}>
                {mine ? "Add information" : "Add your response"}
              </Button>
            )}
          </>
        )
      }
    >
      {d && (
        <div className="flex flex-col gap-4">
          <dl className="flex flex-col gap-2 rounded-lg bg-[#fafafa] p-4 text-[13px] leading-[1.45] outline -outline-offset-1 outline-border">
            {(
              [
                ["Date filed", dateOf(d.at)],
                ["Contract", contractName(d)],
                [side === "team" ? "Independent" : "Company", partyName(d, otherParty(side))],
                ["Filed by", mine ? "You" : partyName(d, d.filedBy)],
                ["Reason", d.reason],
                ["Amount in question", usd(d.amount)],
                ["Supporting evidence", d.evidence ?? "None attached"],
                ["Status", d.status],
              ] as const
            ).map(([k, v]) => (
              <div key={k} className="flex gap-4">
                <dt className="w-[150px] shrink-0 text-ink-2">{k}</dt>
                <dd className="min-w-0 flex-1 break-words text-ink">{v}</dd>
              </div>
            ))}
          </dl>

          <Section label="Description">
            <p className="rounded-lg bg-white p-4 text-[14px] leading-[1.45] text-ink outline -outline-offset-1 outline-border">{d.description}</p>
          </Section>

          {asked && (
            <div className="rounded-lg bg-warn-bg px-4 py-3 text-[13px] leading-[1.45] text-ink">
              <p className="font-semibold">Hireable support asked you for more information</p>
              <p className="text-ink-2">{asked.note}</p>
            </div>
          )}

          {d.statements.length > 0 && (
            <Section label="Statements">
              <ul className="flex flex-col gap-2">
                {d.statements.map((s) => (
                  <li key={s.at} className="flex flex-col gap-1 rounded-lg p-3 text-[13px] leading-[1.45] outline -outline-offset-1 outline-border">
                    <p className="text-[12px] text-ink-2">
                      {s.from === side ? "You" : partyName(d, s.from)} · {stampOf(s.at)}
                    </p>
                    <p className="text-ink">{s.text}</p>
                    {s.evidence && <p className="break-words text-primary">Evidence: {s.evidence}</p>}
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {outcome ? (
            <Section label="Hireable resolution">
              <div className={`flex flex-col gap-2 rounded-lg p-4 outline -outline-offset-1 ${d.status === "Rejected" ? "bg-[#fafafa] outline-border" : "bg-[#f3faf6] outline-[#bfe3cc]"}`}>
                <p className="text-[14px] leading-[1.4] font-semibold text-ink">{outcome}</p>
                <p className="text-[13.5px] leading-[1.5] text-ink-2">{d.resolution?.notes}</p>
              </div>
            </Section>
          ) : d.status === "Withdrawn" ? (
            <p className="text-[13px] leading-[1.45] text-ink-2">
              {mine ? "You withdrew this dispute" : `${partyName(d, d.filedBy)} withdrew this dispute`}, so the review stopped and the hold was lifted. It stays on file and this contract can't be disputed again by the party who withdrew it.
            </p>
          ) : (
            <p className="text-[13px] leading-[1.45] text-ink-2">
              Hireable support is checking the objective log and the agreed process steps, and {usd(d.amount)} stays in escrow meanwhile. Most disputes are resolved within {SLA_DAYS} working days; the outcome appears here.
            </p>
          )}
        </div>
      )}
    </Modal>
  );
}

/** A statement from either side — the respondent's side of it, or the evidence support asked for. */
function StatementForm({ dispute: d, side, onClose, onSent }: { dispute: Dispute | null; side: DisputeParty; onClose: () => void; onSent: () => void }) {
  const [text, setText] = useState("");
  const [evidence, setEvidence] = useState("");
  const mine = d?.filedBy === side;
  const close = () => {
    setText("");
    setEvidence("");
    onClose();
  };
  return (
    <Modal
      open={!!d}
      onClose={close}
      title={mine ? "Add information" : "Add your response"}
      description={d ? `Hireable support reads this alongside the dispute, and ${partyName(d, otherParty(side))} can read it too.` : undefined}
      footer={
        <>
          <Button size="lg" onClick={close}>
            Cancel
          </Button>
          <Button
            size="lg"
            variant="primary"
            disabled={!text.trim()}
            onClick={() => {
              if (!d) return;
              addStatement(d.id, side, text, evidence);
              setText("");
              setEvidence("");
              onSent();
            }}
          >
            Send
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <Field label={mine ? "What else should support know?" : "Your side"}>
          <Textarea rows={4} value={text} onChange={(e) => setText(e.target.value)} placeholder="Dates, what was agreed and what happened. Keep to the facts support can check." />
        </Field>
        <Field label="Supporting evidence (optional)">
          <Input value={evidence} onChange={(e) => setEvidence(e.target.value)} placeholder="Link to a document, a report, a thread or a screenshot" />
        </Field>
      </div>
    </Modal>
  );
}

/** TB-093 / IN-082 — confirm first; withdrawing can't be undone and closes the contract to a refile. */
function WithdrawConfirm({ dispute: d, side, onClose, onDone }: { dispute: Dispute | null; side: DisputeParty; onClose: () => void; onDone: () => void }) {
  return (
    <Modal
      open={!!d}
      onClose={onClose}
      tone="danger"
      title="Withdraw this dispute?"
      description={
        d
          ? `The review stops and the ${usd(d.amount)} hold on the escrow is lifted. ${partyName(d, otherParty(side))} and Hireable support are told. It stays on file as Withdrawn, and you can't file another one on this contract.`
          : undefined
      }
      footer={
        <>
          <Button size="lg" onClick={onClose}>
            Keep it open
          </Button>
          <Button
            size="lg"
            variant="danger"
            onClick={() => {
              if (d) withdrawDispute(d.id, side);
              onDone();
            }}
          >
            Withdraw dispute
          </Button>
        </>
      }
    />
  );
}

/**
 * The three dialogs a dispute can open, wired together, for any screen that lists disputes. They
 * hold ids rather than records, so a change made in another tab shows up in an open dialog.
 */
export function useDisputeFlow(side: DisputeParty, toast: (m: string) => void, initial: string | null = null) {
  const all = useDisputes();
  const [viewing, setViewing] = useState<string | null>(initial);
  const [responding, setResponding] = useState<string | null>(null);
  const [withdrawing, setWithdrawing] = useState<string | null>(null);
  const find = (id: string | null) => (id ? (all.find((d) => d.id === id) ?? null) : null);
  const modals = (
    <>
      <DisputeDetail
        dispute={find(viewing)}
        side={side}
        onClose={() => setViewing(null)}
        onRespond={(d) => {
          setViewing(null);
          setResponding(d.id);
        }}
        onWithdraw={(d) => {
          setViewing(null);
          setWithdrawing(d.id);
        }}
      />
      <StatementForm
        dispute={find(responding)}
        side={side}
        onClose={() => setResponding(null)}
        onSent={() => {
          setResponding(null);
          toast("Sent — Hireable support and the other party can read it");
        }}
      />
      <WithdrawConfirm
        dispute={find(withdrawing)}
        side={side}
        onClose={() => setWithdrawing(null)}
        onDone={() => {
          setWithdrawing(null);
          toast("Dispute withdrawn — Hireable support and the other party have been notified");
        }}
      />
    </>
  );
  return { view: (d: Dispute) => setViewing(d.id), respond: (d: Dispute) => setResponding(d.id), withdraw: (d: Dispute) => setWithdrawing(d.id), modals };
}

/** IN-032 / IN-046 — every dispute on one contract, whoever filed it, for its Contract & Payment tab. */
export function DisputeRows({ disputes, side, onView }: { disputes: Dispute[]; side: DisputeParty; onView: (d: Dispute) => void }) {
  return (
    <ul className="flex flex-col">
      {disputes.map((d) => {
        const outcome = outcomeOf(d);
        return (
          <li key={d.id} className="flex items-center gap-3 border-t border-border py-3 text-[13px] leading-[1.4] first:border-t-0 first:pt-0 last:pb-0">
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <p className="font-medium text-ink">
                {d.reason} · {usd(d.amount)}
              </p>
              <p className="text-ink-2">
                Filed {dateOf(d.at)} by {d.filedBy === side ? "you" : partyName(d, d.filedBy)}
              </p>
              {outcome && <p className="text-ink-2">{outcome}</p>}
            </div>
            <StatusDot tone={STATUS_TONE[d.status]}>{d.status}</StatusDot>
            <Button size="sm" onClick={() => onView(d)}>
              View
            </Button>
          </li>
        );
      })}
    </ul>
  );
}

/* ------------------------------------------------------------ list page -- */

const TEAM_COLS = ["w-[198px]", "min-w-0 flex-1", "w-[104px]", "w-[112px]", "w-[168px]", "w-[112px]", "w-[176px]"];
const IND_COLS = ["w-[108px]", "min-w-0 flex-1", "w-[180px]", "w-[112px]", "w-[168px]", "w-[112px]", "w-[176px]"];
const COPY = {
  team: {
    sentEmpty: "If something goes wrong on a contract, file a dispute from that independent's tracker and it will be listed here.",
    receivedEmpty: "If an independent files a dispute on one of your contracts, it's listed here so you can add your side.",
  },
  independent: {
    sentEmpty: "If a payment goes wrong on a contract, file a dispute from that contract's Contract & Payment tab and it is listed here.",
    receivedEmpty: "If a company files a dispute on one of your contracts, it's listed here so you can add your side.",
  },
};

/**
 * TB-091 / IN-080 — Sent is every dispute this side filed, across all contracts, newest first.
 * Received is the ones filed against them, which used to exist nowhere: a notification said
 * "respond from Payments" and Payments showed nothing. `?open=` opens one straight from a
 * notification.
 */
export function DisputesPage({ side }: { side: DisputeParty }) {
  const all = useDisputes();
  const [tab, setTab] = useQueryState("tab", "sent", ["sent", "received"] as const);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("All statuses");
  const [toast, setToast] = useToast();
  const flow = useDisputeFlow(side, setToast, useSearchParams().get("open"));

  // One pair in the demo, but a portal still only lists the disputes it is a party to.
  const ours = all.filter((d) => (side === "team" ? d.team.company === PAIR.team.company : d.independent.slug === PAIR.independent.slug));
  const sent = ours.filter((d) => d.filedBy === side);
  const received = ours.filter((d) => d.filedBy !== side);
  const list = tab === "sent" ? sent : received;
  const counterpart = (d: Dispute) => partyName(d, otherParty(side));
  const rows = list.filter((d) => (status === "All statuses" || d.status === status) && `${contractName(d)} ${counterpart(d)} ${d.reason}`.toLowerCase().includes(q.trim().toLowerCase()));
  const pending = list.filter((d) => d.status === "Pending").length;
  const cols = side === "team" ? TEAM_COLS : IND_COLS;
  const head = side === "team" ? ["Independent", "Contract", "Filed", "Amount", "Reason", "Status", "Actions"] : ["Filed", "Contract", "Company", "Amount", "Reason", "Status", "Actions"];

  return (
    <Page
      title="Disputes"
      tabs={
        <Tabs
          className="px-4"
          value={tab}
          onChange={setTab}
          options={[
            { value: "sent", label: `Sent (${sent.length})` },
            { value: "received", label: `Received (${received.length})` },
          ]}
        />
      }
    >
      <Toolbar
        right={
          <span className="text-[14px] leading-[1.4] text-ink-2">
            {list.length} {list.length === 1 ? "dispute" : "disputes"} · {pending} pending
          </span>
        }
      >
        <SearchBox value={q} onChange={setQ} placeholder={side === "team" ? "Search by independent, contract or reason" : "Search by company, contract or reason"} className="w-[320px]" />
        <Select options={["All statuses", ...DISPUTE_STATUSES]} value={status} onChange={(e) => setStatus(e.target.value)} className="!w-[180px]" />
      </Toolbar>

      {list.length === 0 ? (
        <EmptyState title={tab === "sent" ? "No disputes filed" : "No disputes against you"} body={tab === "sent" ? COPY[side].sentEmpty : COPY[side].receivedEmpty} />
      ) : rows.length === 0 ? (
        <EmptyState
          title="No disputes match"
          body="Try a different status, or clear the search to see all of them."
          action={
            <Button
              size="lg"
              variant="primary"
              onClick={() => {
                setQ("");
                setStatus("All statuses");
              }}
            >
              Clear filters
            </Button>
          }
        />
      ) : (
        <Table cols={cols} head={head}>
          {rows.map((d) => (
            <Row key={d.id}>
              {side === "team" ? (
                <>
                  <span className={cols[0]}>
                    <Person name={d.independent.name} role={d.title} avatar={d.independent.avatar} />
                  </span>
                  <span className={`${cols[1]} truncate text-[14px]`}>{contractName(d)}</span>
                  <span className={`${cols[2]} text-ink-2`}>{dateOf(d.at)}</span>
                </>
              ) : (
                <>
                  <span className={`${cols[0]} text-ink-2`}>{dateOf(d.at)}</span>
                  <span className={`${cols[1]} truncate text-[14px]`}>{contractName(d)}</span>
                  <span className={`${cols[2]} truncate`}>{d.team.company}</span>
                </>
              )}
              <span className={`${cols[3]} text-[14px]`}>{usd(d.amount)}</span>
              <span className={`${cols[4]} truncate text-ink-2`}>{d.reason}</span>
              <span className={cols[5]}>
                <StatusDot tone={STATUS_TONE[d.status]}>{d.status}</StatusDot>
              </span>
              <span className={`${cols[6]} flex gap-2`}>
                <Button size="sm" onClick={() => flow.view(d)}>
                  View
                </Button>
                {/* TB-093 / IN-082 — only the filer withdraws, and only while it is Pending. */}
                {d.status === "Pending" &&
                  (d.filedBy === side ? (
                    <Button size="sm" onClick={() => flow.withdraw(d)}>
                      Withdraw
                    </Button>
                  ) : (
                    <Button size="sm" variant="primary" onClick={() => flow.respond(d)}>
                      Respond
                    </Button>
                  ))}
              </span>
            </Row>
          ))}
        </Table>
      )}

      <p className="text-[12.5px] leading-[1.5] text-muted">
        Hireable reviews disputes for process compliance only — whether the agreed steps were followed — not for the subjective quality of the work. The amount in question stays in escrow until the review ends; most are resolved within {SLA_DAYS} working days.
      </p>

      {flow.modals}
      <Toast message={toast} onClose={() => setToast(null)} />
    </Page>
  );
}
