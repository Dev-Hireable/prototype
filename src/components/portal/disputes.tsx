"use client";

import { useState } from "react";
import { Button, EmptyState, Field, Input, LinkButton, Modal, Page, SearchBox, Select, StatusDot, Tabs, Textarea } from "@/components/independent/ui";
import { AttachmentPicker } from "@/components/portal/DisputeCase";
import { Person, Row, Table, Toolbar } from "@/components/team/ui";
import { caseHref, checkAmount, contractName, dateOf, DISPUTE_REASONS, DISPUTE_STATUSES, leftLabel, otherParty, outcomeOf, partyName, partyTurn, SLA_DAYS, STATUS_TONE, TURN_DAYS, usd, useDisputes, waitingOn } from "@/lib/demo/disputes";
import type { Attachment, Dispute, DisputeParty } from "@/lib/demo/disputes";
import { keepFile } from "@/lib/demo/files";
import { PAIR } from "@/lib/demo/live";
import { useQueryState } from "@/lib/portal/query-state";
import { useNow } from "@/lib/portal/use-now";

/**
 * The dispute screens both portals share: filing one, the lists, and the rows on a contract's
 * Contract & Payment tab. Each dispute opens as a case page (./DisputeCase), where both sides
 * answer in turns. `side` is whose portal it is.
 */

const REASON_PROMPT = "Select a reason";

export type DisputeDraft = { reason: string; description: string; amount: number; evidence?: string; attachments?: Attachment[] };

/**
 * TB-073 / TB-118 / IN-059 — reason, description and amount are required; screenshots, files and
 * a link are optional. No reason is preselected, and the amount has to be a positive sum no bigger
 * than `cap`. Files are kept in this browser before the dispute is filed with them.
 */
export function DisputeForm({ open, onClose, title, description, cap, capNote, onFile }: { open: boolean; onClose: () => void; title: string; description: string; cap: number; capNote: string; onFile: (d: DisputeDraft) => void | Promise<void> }) {
  const form = useDisputeDraft(cap, onFile);
  const close = () => {
    form.reset();
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={close}
      width={600}
      title={title}
      description={description}
      footer={
        <>
          <Button size="lg" onClick={close}>
            Cancel
          </Button>
          <Button size="lg" variant="danger" disabled={!form.ready || form.busy} onClick={() => void form.file()}>
            {form.busy ? "Filing…" : "File dispute"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <Field label="Reason">
          <Select options={[REASON_PROMPT, ...DISPUTE_REASONS]} value={form.reason || REASON_PROMPT} onChange={(e) => form.setReason(e.target.value === REASON_PROMPT ? "" : e.target.value)} />
        </Field>
        <Field label="What happened?">
          <Textarea rows={4} value={form.text} onChange={(e) => form.setText(e.target.value)} placeholder="Dates, what was agreed and what happened instead. Support reads this first." />
        </Field>
        {/* The error shows once there is something to judge, not on an untouched field. */}
        <Field label="Amount in question (USD)" hint={`Up to ${usd(cap)} — ${capNote}`} error={form.touched || form.amount.trim() ? form.checked.error : undefined}>
          <Input value={form.amount} inputMode="decimal" onChange={(e) => form.setAmount(e.target.value)} onBlur={() => form.setTouched(true)} placeholder="1,600.00" />
        </Field>
        <div className="flex flex-col gap-2">
          <p className="text-[14px] leading-[1.2] font-semibold tracking-[0.2px] text-ink">Screenshots and files (optional)</p>
          <AttachmentPicker files={form.files} onChange={form.setFiles} onError={form.setFileError} />
          {form.fileError && (
            <p role="alert" className="text-[12.5px] leading-[1.4] text-danger">
              {form.fileError}
            </p>
          )}
        </div>
        <Field label="Link (optional)">
          <Input value={form.evidence} onChange={(e) => form.setEvidence(e.target.value)} placeholder="A document or thread that lives somewhere else" />
        </Field>
        <p className="text-[12.5px] leading-[1.4] text-ink-2">
          {form.ready ? `Once it's filed, the other side has ${TURN_DAYS} days to respond. If they don't, it closes in your favor.` : "Choose a reason, say what happened and enter the amount before filing."}
        </p>
      </div>
    </Modal>
  );
}

/**
 * The dispute being written: its fields, whether it can be filed yet, and filing it — the files are
 * kept in this browser first, and a filed dispute leaves the form empty.
 */
function useDisputeDraft(cap: number, onFile: (d: DisputeDraft) => void | Promise<void>) {
  const [reason, setReason] = useState("");
  const [text, setText] = useState("");
  const [amount, setAmount] = useState("");
  const [evidence, setEvidence] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const checked = checkAmount(amount, cap);
  const ready = !!reason && !!text.trim() && checked.value !== null;
  const reset = () => {
    setReason("");
    setText("");
    setAmount("");
    setEvidence("");
    setFiles([]);
    setFileError(null);
    setTouched(false);
  };
  const file = async () => {
    if (checked.value === null) return;
    setBusy(true);
    try {
      const attachments = await Promise.all(files.map(keepFile));
      await onFile({ reason, description: text.trim(), amount: checked.value, evidence: evidence.trim() || undefined, attachments });
      reset();
    } catch {
      setFileError("The files couldn't be saved in this browser. Try fewer or smaller ones.");
    } finally {
      setBusy(false);
    }
  };
  return { reason, setReason, text, setText, amount, setAmount, evidence, setEvidence, files, setFiles, fileError, setFileError, touched, setTouched, busy, checked, ready, reset, file };
}

/** "You · 4 days left", "Juan Dela Cruz · 2 days left", "Hireable support" — or nothing once it's closed. */
function WaitingOn({ d, side, now }: { d: Dispute; side: DisputeParty; now: number }) {
  const who = waitingOn(d);
  const t = partyTurn(d);
  if (!who) return <span className="text-ink-2">—</span>;
  if (who === "support") return <span className="text-ink-2">Hireable support</span>;
  const left = t ? leftLabel(t.due, now).toLowerCase() : "";
  return who === side ? <span className="font-semibold text-[#8e6f12]">You · {left}</span> : <span className="truncate">{partyName(d, who)} · {left}</span>;
}

/** IN-032 / IN-046 — every dispute on one contract, whoever filed it, for its Contract & Payment tab. */
export function DisputeRows({ disputes, side }: { disputes: Dispute[]; side: DisputeParty }) {
  const now = useNow();
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
                {d.status === "Pending" && (
                  <>
                    {" · Waiting on "}
                    <WaitingOn d={d} side={side} now={now} />
                  </>
                )}
              </p>
              {outcome && <p className="text-ink-2">{outcome}</p>}
            </div>
            <StatusDot tone={STATUS_TONE[d.status]}>{d.status}</StatusDot>
            <CaseLink d={d} side={side} />
          </li>
        );
      })}
    </ul>
  );
}

/** Into the case: Respond while it's waiting on this side, Open otherwise. */
function CaseLink({ d, side }: { d: Dispute; side: DisputeParty }) {
  const mine = waitingOn(d) === side;
  return (
    <LinkButton size="sm" variant={mine ? "primary" : "secondary"} href={caseHref(side, d.id)}>
      {mine ? "Respond" : "Open"}
    </LinkButton>
  );
}

/* ------------------------------------------------------------ list page -- */

/** Each side's table: the column widths, and the headings over them. */
const TABLES: Record<DisputeParty, { cols: string[]; head: string[] }> = {
  team: {
    cols: ["w-[198px]", "min-w-0 flex-1", "w-[104px]", "w-[112px]", "w-[184px]", "w-[112px]", "w-[104px]"],
    head: ["Independent", "Contract · reason", "Filed", "Amount", "Waiting on", "Status", ""],
  },
  independent: {
    cols: ["w-[108px]", "min-w-0 flex-1", "w-[180px]", "w-[112px]", "w-[184px]", "w-[112px]", "w-[104px]"],
    head: ["Filed", "Contract · reason", "Company", "Amount", "Waiting on", "Status", ""],
  },
};
const COPY = {
  team: {
    sentEmpty: "If something goes wrong on a contract, file a dispute from that independent's tracker and it will be listed here.",
    receivedEmpty: "If an independent files a dispute on one of your contracts, it's listed here so you can respond.",
  },
  independent: {
    sentEmpty: "If a payment goes wrong on a contract, file a dispute from that contract's Contract & Payment tab and it is listed here.",
    receivedEmpty: "If a company files a dispute on one of your contracts, it's listed here so you can respond.",
  },
};

/**
 * TB-091 / IN-080 — Sent is every dispute this side filed, across all contracts, newest first;
 * Received is the ones filed against them. Each row says who the case is waiting on and opens it.
 */
export function DisputesPage({ side }: { side: DisputeParty }) {
  const all = useDisputes();
  const now = useNow();
  const [tab, setTab] = useQueryState("tab", "sent", ["sent", "received"] as const);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("All statuses");
  // Old notifications' ?open= links to this list are sent on to the case by next.config.ts.

  const { sent, received, list, rows, yours } = disputeLists(all, side, tab, status, q);
  const { cols, head } = TABLES[side];
  const clearFilters = () => {
    setQ("");
    setStatus("All statuses");
  };

  return (
    <Page
      title="Disputes"
      tabs={
        <Tabs
          value={tab}
          onChange={setTab}
          options={[
            { value: "sent", label: `Sent (${sent.length})` },
            { value: "received", label: `Received (${received.length})` },
          ]}
        />
      }
    >
      <Toolbar right={<ListCount list={list} yours={yours} />}>
        <SearchBox value={q} onChange={setQ} placeholder={side === "team" ? "Search by independent, contract or reason" : "Search by company, contract or reason"} className="w-[320px]" />
        <Select options={["All statuses", ...DISPUTE_STATUSES]} value={status} onChange={(e) => setStatus(e.target.value)} className="!w-[180px]" />
      </Toolbar>

      {list.length === 0 ? (
        <EmptyState title={tab === "sent" ? "No disputes filed" : "No disputes against you"} body={tab === "sent" ? COPY[side].sentEmpty : COPY[side].receivedEmpty} />
      ) : rows.length === 0 ? (
        <NoMatches onClear={clearFilters} />
      ) : (
        <Table cols={cols} head={head}>
          {rows.map((d) => (
            <DisputeRow key={d.id} d={d} side={side} cols={cols} now={now} />
          ))}
        </Table>
      )}

      <p className="text-[12.5px] leading-[1.5] text-muted">
        Each side answers in turn and has {TURN_DAYS} days to do it — a turn that runs out closes the dispute for the other side. Hireable support reviews the process, not the quality of the work, usually within {SLA_DAYS} working days, and the two sides can settle between themselves at any point. The amount in question stays put until it closes — in escrow on a trial, kept back from the pay on a full-time or part-time role.
      </p>
    </Page>
  );
}

/**
 * The page's lists: the disputes this side is party to, as Sent (what it filed) and Received (what
 * was filed against it); the open tab's, and what's left of them after the search and status; and
 * how many are waiting on this side.
 */
function disputeLists(all: Dispute[], side: DisputeParty, tab: "sent" | "received", status: string, q: string) {
  // One pair in the demo, but a portal still only lists the disputes it is a party to.
  const ours = all.filter((d) => (side === "team" ? d.team.company === PAIR.team.company : d.independent.slug === PAIR.independent.slug));
  const sent = ours.filter((d) => d.filedBy === side);
  const received = ours.filter((d) => d.filedBy !== side);
  const list = tab === "sent" ? sent : received;
  const counterpart = (d: Dispute) => partyName(d, otherParty(side));
  const rows = list.filter((d) => (status === "All statuses" || d.status === status) && `${contractName(d)} ${counterpart(d)} ${d.reason}`.toLowerCase().includes(q.trim().toLowerCase()));
  const yours = ours.filter((d) => waitingOn(d) === side).length;
  return { sent, received, list, rows, yours };
}

/** Beside the filters: how many disputes the tab holds and how many are open, then how many wait on this side. */
function ListCount({ list, yours }: { list: Dispute[]; yours: number }) {
  return (
    <span className="text-[14px] leading-[1.4] text-ink-2">
      {list.length} {list.length === 1 ? "dispute" : "disputes"} · {list.filter((d) => d.status === "Pending").length} open
      {yours > 0 && <span className="font-semibold text-[#8e6f12]"> · {yours} waiting on you</span>}
    </span>
  );
}

/** When the search and status leave nothing on the tab: say so, with the way back to all of them. */
function NoMatches({ onClear }: { onClear: () => void }) {
  return (
    <EmptyState
      title="No disputes match"
      body="Try a different status, or clear the search to see all of them."
      action={
        <Button size="lg" variant="primary" onClick={onClear}>
          Clear filters
        </Button>
      }
    />
  );
}

/**
 * One dispute in the table: who it's with (the Team Builder's) or when it was filed (the talent's)
 * first, then the contract and reason, the amount, who it's waiting on, its status and the way in.
 */
function DisputeRow({ d, side, cols, now }: { d: Dispute; side: DisputeParty; cols: string[]; now: number }) {
  return (
    <Row>
      {side === "team" ? (
        <>
          <span className={cols[0]}>
            <Person name={d.independent.name} role={d.title} avatar={d.independent.avatar} />
          </span>
          <ContractCell d={d} className={cols[1]} />
          <span className={`${cols[2]} text-ink-2`}>{dateOf(d.at)}</span>
        </>
      ) : (
        <>
          <span className={`${cols[0]} text-ink-2`}>{dateOf(d.at)}</span>
          <ContractCell d={d} className={cols[1]} />
          <span className={`${cols[2]} truncate`}>{d.team.company}</span>
        </>
      )}
      <span className={`${cols[3]} text-[14px]`}>{usd(d.amount)}</span>
      <span className={`${cols[4]} truncate`}>
        <WaitingOn d={d} side={side} now={now} />
      </span>
      <span className={cols[5]}>
        <StatusDot tone={STATUS_TONE[d.status]}>{d.status}</StatusDot>
      </span>
      <span className={`${cols[6]} flex justify-end`}>
        <CaseLink d={d} side={side} />
      </span>
    </Row>
  );
}

/** The table's contract column: the contract, with the reason under it. */
function ContractCell({ d, className }: { d: Dispute; className: string }) {
  return (
    <span className={`${className} flex flex-col`}>
      <span className="truncate text-[14px]">{contractName(d)}</span>
      <span className="truncate text-ink-2">{d.reason}</span>
    </span>
  );
}
