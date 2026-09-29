"use client";

import { SIDE_COLUMN, WITH_SIDE } from "@/components/portal/page-parts";
import Link from "next/link";
import { notFound } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { ICONS } from "@/components/icons";
import { Avatar, Button, Field, Input, Modal, Page, Pills, StatusDot, Textarea, Toast } from "@/components/portal/ui";
import { Callout } from "@/components/portal/callout";
import { Meter } from "@/components/portal/meter";
import { BreadcrumbBack } from "@/components/portal/nav";
import { PanelCard } from "@/components/portal/panel-card";
import { ReturnNav } from "@/components/portal/return";
import { useDeal, useHydrated } from "@/lib/demo/deal";
import {
  addToDispute,
  answerSettlement,
  checkSplit,
  contractName,
  dateOf,
  dealContract,
  escrowOf,
  factsFor,
  isOpen,
  leftLabel,
  openProposal,
  otherParty,
  outcomeOf,
  partyCan,
  partyName,
  partyTurn,
  proposeSettlement,
  respondToDispute,
  SLA_DAYS,
  stampOf,
  STATUS_TONE,
  TURN_DAYS,
  usd,
  useDisputes,
  withdrawDispute,
} from "@/lib/demo/disputes";
import type { Attachment, Dispute, DisputeParty, Entry, Proposal } from "@/lib/demo/disputes";
import type { PartyTurn } from "@/lib/disputes/case";
import { CASE_FILE_TYPES, checkCaseFile, keepFile, MAX_CASE_FILE_MB, MAX_CASE_FILES, sizeLabel, useFileUrl } from "@/lib/demo/files";
import { PAIR, useLive, type LivePayment } from "@/lib/demo/live";
import { keyed } from "@/lib/portal/keys";
import { useToast, type SetToast } from "@/lib/portal/toast";
import { useNow } from "@/lib/portal/use-now";

/**
 * A dispute, worked as a case — the same page for the Team Builder, the Independent and Hireable
 * support: whose turn it is and until when, where each side stands, one timeline of everything
 * either side and support have done, the settlement on the table, and the money. The parties
 * reply from here; support acts from its own header (the admin page).
 */

export type CaseViewer = DisputeParty | "admin";

/**
 * Each side's colour on the timeline, and how they're labelled — Hireable's: the Independent in the
 * brand pink, the company (the client) in the brand blue. The tags use a dark shade of each on its
 * own tint so the label clears AA; the avatar ring is the brand colour itself.
 */
const ACTOR: Record<Entry["by"], { mark: string; tag: string; role: string }> = {
  team: { mark: "ring-brand-blue", tag: "bg-[#e6f6fe] text-[#005b8a]", role: "Company" },
  independent: { mark: "ring-brand-pink", tag: "bg-[#ffebf1] text-[#a3123f]", role: "Independent" },
  support: { mark: "ring-[#d99a00]", tag: "bg-[#fff3cc] text-[#7a5e0a]", role: "Hireable support" },
  system: { mark: "ring-[#8a8f98]", tag: "bg-surface-2 text-ink-2", role: "Hireable" },
};

const avatarOf = (d: Dispute, by: Entry["by"]) => (by === "team" ? PAIR.team.avatar : by === "independent" ? d.independent.avatar : by === "support" ? "/admin/avatar.jpg" : null);

/** The actor as the viewer reads them: "You", the company, the Independent, or Hireable. */
function nameFor(d: Dispute, by: Entry["by"], viewer: CaseViewer, name?: string) {
  if (by === viewer) return "You";
  if (by === "team" || by === "independent") return partyName(d, by);
  if (by === "support") return viewer === "admin" && name ? name : "Hireable support";
  return "Hireable";
}
/** A party inside a sentence: "you" or their name. */
const them = (d: Dispute, p: DisputeParty, viewer: CaseViewer) => (p === viewer ? "you" : partyName(d, p));

/* --------------------------------------------------------------- page -- */

/** TB-092 / IN-081 — a party's own view of the case, reached from Disputes or any notification about it. */
export function DisputeCasePage({ side, id }: { side: DisputeParty; id: string }) {
  const hydrated = useHydrated();
  const d = useDisputes().find((x) => x.id === id);
  const now = useNow();
  const [toast, setToast] = useToast();
  const [withdrawing, setWithdrawing] = useState(false);
  // Everything lives in this browser's storage, so there's nothing to look up until it's loaded.
  if (!hydrated) return null;
  if (!d) notFound();
  const list = side === "team" ? "/team/payments/disputes" : "/independent/wallet/disputes";
  const can = partyCan(d, side, now);
  return (
    <Page
      title={
        <>
          Dispute · {contractName(d)} <StatusDot tone={STATUS_TONE[d.status]}>{d.status}</StatusDot>
        </>
      }
      nav={<ReturnNav fallback={<BreadcrumbBack href={`${list}?tab=${d.filedBy === side ? "sent" : "received"}`}>Back to disputes</BreadcrumbBack>} />}
      navActions={
        can.withdraw ? (
          <Button size="md" variant="danger" onClick={() => setWithdrawing(true)}>
            Withdraw dispute
          </Button>
        ) : undefined
      }
    >
      <DisputeCase dispute={d} viewer={side} onToast={setToast} />
      {/* TB-093 / IN-082 — confirmed first; it can't be undone and closes the contract to a refile. */}
      <Modal
        open={withdrawing}
        onClose={() => setWithdrawing(false)}
        tone="danger"
        title="Withdraw this dispute?"
        description={`The case closes and the ${usd(d.amount)} hold is lifted. ${partyName(d, otherParty(side))} and Hireable support are told. It stays on file as Withdrawn, and you can't file another one on this contract.`}
        footer={
          <>
            <Button size="lg" onClick={() => setWithdrawing(false)}>
              Keep it open
            </Button>
            <Button
              size="lg"
              variant="danger"
              onClick={async () => {
                const r = await withdrawDispute(d.id, side);
                setWithdrawing(false);
                setToast(r.ok ? "Dispute withdrawn — the other side and Hireable support have been told" : r.error, r.ok ? "success" : "danger");
              }}
            >
              Withdraw dispute
            </Button>
          </>
        }
      />
      <Toast toast={toast} onClose={() => setToast(null)} />
    </Page>
  );
}

/** The case itself, for whichever of the three is looking. */
export function DisputeCase({ dispute: d, viewer, onToast }: { dispute: Dispute; viewer: CaseViewer; onToast: SetToast }) {
  const now = useNow();
  const reply = useRef<HTMLTextAreaElement>(null);
  const [mode, setMode] = useState<"say" | "propose">("say");
  const proposal = openProposal(d);
  const toReply = () => {
    setMode("say");
    document.getElementById("reply")?.scrollIntoView({ behavior: "smooth", block: "center" });
    // After the form is back on "say" — the textarea may only just have mounted.
    requestAnimationFrame(() => reply.current?.focus());
  };
  return (
    <div className="flex flex-col gap-5">
      <TurnBanner d={d} viewer={viewer} now={now} onRespond={toReply} />
      <div className={WITH_SIDE}>
        <div className="flex w-full min-w-0 flex-1 flex-col gap-4">
          <Parties d={d} viewer={viewer} now={now} />
          {proposal && <ProposalCard d={d} p={proposal} viewer={viewer} onToast={onToast} />}
          {/* No visible heading: the thread reads as what it is. Screen readers still get the region's name. */}
          <section aria-label="Case timeline" className="flex flex-col gap-3">
            <Timeline d={d} viewer={viewer} now={now} />
          </section>
          {viewer !== "admin" && isOpen(d) && <Composer d={d} side={viewer} now={now} mode={mode} setMode={setMode} textRef={reply} onToast={onToast} />}
        </div>
        <CaseSide d={d} viewer={viewer} />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------- banner -- */

/** Whose move it is and until when — or how it ended. */
function TurnBanner({ d, viewer, now, onRespond }: { d: Dispute; viewer: CaseViewer; now: number; onRespond: () => void }) {
  const t = partyTurn(d);
  if (d.status === "Withdrawn") return <Callout>{d.filedBy === viewer ? "You withdrew this dispute" : `${partyName(d, d.filedBy)} withdrew this dispute`}, so the case closed and the hold was lifted. It stays on file.</Callout>;
  if (!isOpen(d)) return <ClosedBanner d={d} viewer={viewer} />;
  if (t) return <PartyTurnBanner d={d} t={t} viewer={viewer} now={now} onRespond={onRespond} />;
  if (viewer === "admin")
    return (
      <Callout tone="warn">
        <span className="font-semibold">Your turn to review.</span> Rule for one side, reject it, or ask one side for more — they&apos;ll have {TURN_DAYS} days to answer.
      </Callout>
    );
  return <Callout>Hireable support is reviewing the case — usually within {SLA_DAYS} working days. You can still add information or propose a settlement meanwhile.</Callout>;
}

/** How the case ended: the outcome, support's note, and what happens to the money next. */
function ClosedBanner({ d, viewer }: { d: Dispute; viewer: CaseViewer }) {
  const r = d.resolution;
  // The same banner as every other state of the case (it had a green box of its own): the
  // outcome, support's note, and what happens to the money next.
  return (
    <div role="status">
      <Callout>
        <span className="flex flex-col gap-1">
          <span className="font-semibold">{outcomeOf(d)}</span>
          {r?.notes && <span className="whitespace-pre-line">{r.notes}</span>}
          {r?.payment === "awaiting release" && <span>{viewer === "admin" ? "Release the payment to pay it out." : `Hireable support releases the ${usd(d.amount)} next.`}</span>}
        </span>
      </Callout>
    </div>
  );
}

/** A party's turn and its deadline: theirs to respond to, or — to everyone else — who the case is waiting on. */
function PartyTurnBanner({ d, t, viewer, now, onRespond }: { d: Dispute; t: PartyTurn; viewer: CaseViewer; now: number; onRespond: () => void }) {
  const due = `${stampOf(t.due)} (${leftLabel(t.due, now).toLowerCase()})`;
  const winner = partyName(d, otherParty(t.who));
  if (viewer === t.who)
    return (
      <Callout
        tone="warn"
        action={
          <Button size="sm" variant="primary" onClick={onRespond}>
            Respond
          </Button>
        }
      >
        <span className="font-semibold">It&apos;s your turn to respond</span> — by {due}.{" "}
        {t.why === "asked" && t.note ? <>Hireable support asked: “{t.note}” </> : null}
        If you don&apos;t respond in time, the dispute closes in {winner}&apos;s favor.
      </Callout>
    );
  return (
    <Callout>
      Waiting on {partyName(d, t.who)} to {t.why === "asked" ? "answer Hireable support" : "respond"} — they have until {due}.{" "}
      {viewer === "admin" ? `If they don't respond, it closes in ${winner}'s favor.` : "If they don't, the dispute closes in your favor."}
    </Callout>
  );
}

/* ------------------------------------------------------------ parties -- */

const DID: Partial<Record<Entry["kind"], string>> = {
  filed: "Filed the dispute",
  response: "Responded",
  info: "Added information",
  proposal: "Proposed a settlement",
  accepted: "Accepted the settlement",
  declined: "Declined the settlement",
  withdrawn: "Withdrew the dispute",
};

/** Where each side stands, at a glance: whose turn it is, and what each last did. */
function Parties({ d, viewer, now }: { d: Dispute; viewer: CaseViewer; now: number }) {
  const t = partyTurn(d);
  const cell = (by: "team" | "independent" | "support") => {
    const last = [...d.entries].reverse().find((e) => e.by === by && (by === "support" || DID[e.kind]));
    const turn = by === "support" ? isOpen(d) && !t : t?.who === by;
    const status =
      by === "support"
        ? !isOpen(d)
          ? `Closed ${dateOf(d.resolution?.at ?? d.updated)}`
          : turn
            ? `Reviewing since ${dateOf(d.turn?.since ?? d.updated)}`
            : "Reviews once they've responded"
        : turn && t
          ? `${viewer === by ? "Your" : "Their"} turn · ${leftLabel(t.due, now).toLowerCase()}`
          : last
            ? `${DID[last.kind]} · ${dateOf(last.at)}`
            : "No response yet";
    const avatar = avatarOf(d, by);
    return (
      // Whose turn it is: the app's selected look — a solid blue ring, outside the card so nothing
      // inside can paint over it — rather than a yellow tint of its own.
      <li key={by} className={`flex min-w-0 flex-1 items-center gap-3 rounded-lg bg-white p-3 ${turn ? "ring-2 ring-primary" : "outline -outline-offset-1 outline-border"}`} aria-current={turn ? "step" : undefined}>
        {avatar && <Avatar src={avatar} size={36} />}
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="truncate text-[13.5px] leading-[1.3] font-semibold text-ink">{by === "support" ? (d.handler && viewer === "admin" ? d.handler : "Hireable support") : nameFor(d, by, viewer) === "You" ? `You · ${partyName(d, by)}` : partyName(d, by)}</span>
          <span className="text-[12px] leading-[1.3] text-ink-2">{ACTOR[by].role}</span>
          <span className={`text-[12.5px] leading-[1.3] ${turn ? "font-semibold text-primary" : "text-ink-2"}`}>{status}</span>
        </span>
      </li>
    );
  };
  return <ul className="flex gap-2 max-sm:flex-col" aria-label="Where each side stands">{(["team", "independent", "support"] as const).map(cell)}</ul>;
}

/* ----------------------------------------------------------- timeline -- */

function headline(d: Dispute, e: Entry, viewer: CaseViewer): string {
  const to = e.to ? them(d, e.to, viewer) : "";
  switch (e.kind) {
    case "filed":
      return "filed the dispute";
    case "response":
      return "responded";
    case "info":
      return "added information";
    case "asked":
      return `asked ${to} for more information`;
    case "extended":
      return `gave ${to} more time to respond`;
    case "proposal":
      return "proposed a settlement";
    case "accepted":
      return "accepted the settlement";
    case "declined":
      return "declined the settlement";
    case "missed":
      return `closed the case — ${to} didn't respond in time`;
    case "ruling":
      return `ruled in favor of ${to}`;
    case "rejected":
      return "rejected the dispute";
    case "released":
      return `released the payment to ${d.independent.name}`;
    case "withdrawn":
      return "withdrew the dispute";
    case "note":
      return e.text ?? "";
  }
}

/** One timeline, oldest first — each entry marked with who it's from. */
function Timeline({ d, viewer, now }: { d: Dispute; viewer: CaseViewer; now: number }) {
  const t = partyTurn(d);
  const entries = [...d.entries].sort((a, b) => a.at - b.at);
  return (
    // A thread, as comments read on Facebook or Reddit: a rail from each avatar down to the next (the
    // last entry's stops at its own card, unless the waiting row follows), and a rounded elbow from
    // the rail into each entry's card. Both start behind the avatar, so nothing reads as cut off.
    <ol className="flex flex-col gap-4 [&>li:last-child]:after:hidden">
      {entries.map((e) => {
        const avatar = avatarOf(d, e.by);
        return (
          <li
            key={e.id}
            className="relative flex gap-3 after:absolute after:top-[30px] after:-bottom-4 after:left-[17px] after:w-0.5 after:bg-border"
            data-entry={e.kind}
            data-by={e.by}
          >
            {/* The elbow: from behind the avatar down the rail, then round into the card, short of its foot. */}
            <span aria-hidden className="absolute top-[30px] bottom-5 left-[17px] w-[31px] rounded-bl-[14px] border-b-2 border-l-2 border-border" />
            <span className={`relative z-10 flex size-9 shrink-0 items-center justify-center rounded-full bg-white ring-2 ${ACTOR[e.by].mark}`}>
              {avatar ? <Avatar src={avatar} size={32} /> : <ICONS.schedule size={18} aria-hidden className="text-ink-2" />}
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-2 rounded-lg bg-white p-4 outline -outline-offset-1 outline-border">
              <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13.5px] leading-[1.4]">
                {e.kind !== "note" && <span className="font-semibold text-ink">{nameFor(d, e.by, viewer, e.name)}</span>}
                <span className="text-ink">{headline(d, e, viewer)}</span>
                <span className={`rounded px-1.5 py-0.5 text-[11.5px] font-medium ${ACTOR[e.by].tag}`}>{ACTOR[e.by].role}</span>
                <time dateTime={new Date(e.at).toISOString()} className="ml-auto text-[12px] whitespace-nowrap text-ink-2">
                  {stampOf(e.at)}
                </time>
              </p>
              <EntryBody d={d} e={e} />
            </div>
          </li>
        );
      })}
      {isOpen(d) && (
        <li className="relative flex items-center gap-3" data-entry="waiting">
          <span className="relative z-10 flex size-9 shrink-0 items-center justify-center rounded-full border-2 border-dashed border-[#c3c3c3] bg-white">
            <ICONS.hourglass size={16} aria-hidden className="text-ink-2" />
          </span>
          <p className="text-[13px] leading-[1.4] text-ink-2">
            {t
              ? `${t.who === viewer ? "Your turn" : `Waiting on ${partyName(d, t.who)}`} — respond by ${stampOf(t.due)} · ${leftLabel(t.due, now).toLowerCase()}`
              : `With Hireable support for review since ${stampOf(d.turn?.since ?? d.updated)}`}
          </p>
        </li>
      )}
    </ol>
  );
}

function Quote({ children }: { children: ReactNode }) {
  return <p className="text-[14px] leading-[1.5] whitespace-pre-line break-words text-ink">{children}</p>;
}

type EntryProps = { d: Dispute; e: Entry };

/** What each kind of entry shows under its headline; a kind that isn't here shows nothing more. */
const ENTRY_BODY: Partial<Record<Entry["kind"], (props: EntryProps) => ReactNode>> = {
  filed: FiledBody,
  response: Statement,
  info: Statement,
  asked: AskedBody,
  extended: ExtendedBody,
  proposal: SettlementBody,
  missed: MissedBody,
  ruling: RulingBody,
  rejected: RulingBody,
  released: ReleasedBody,
};

function EntryBody({ d, e }: EntryProps) {
  const Body = ENTRY_BODY[e.kind];
  return Body ? <Body d={d} e={e} /> : null;
}

/** A filing: what it's about and the amount in question, then what the filer said. */
function FiledBody({ d, e }: EntryProps) {
  return (
    <>
      <p className="text-[12.5px] leading-[1.4] text-ink-2">
        {d.reason} · {usd(d.amount)} in question
      </p>
      <Statement e={e} />
    </>
  );
}

/** What a party said: their words, then the files and the link they added. */
function Statement({ e }: { e: Entry }) {
  return (
    <>
      {e.text && <Quote>{e.text}</Quote>}
      {e.attachments && e.attachments.length > 0 && <Attachments files={e.attachments} />}
      {e.link && (
        <a href={/^https?:\/\//.test(e.link) ? e.link : `https://${e.link}`} target="_blank" rel="noreferrer" className="inline-flex max-w-full items-center gap-1.5 self-start text-[13px] font-medium break-all text-primary hover:underline">
          <ICONS.link size={15} aria-hidden className="shrink-0" /> {e.link}
        </a>
      )}
    </>
  );
}

/** Support's question, and when the answer is due. */
function AskedBody({ e }: EntryProps) {
  return (
    <>
      {e.text && <Quote>{e.text}</Quote>}
      {e.due && <p className="text-[12.5px] leading-[1.4] text-ink-2">Respond by {stampOf(e.due)}</p>}
    </>
  );
}

/** The new deadline support gave. */
function ExtendedBody({ e }: EntryProps) {
  return e.due ? <p className="text-[13px] leading-[1.4] text-ink-2">New deadline: {stampOf(e.due)}</p> : null;
}

/** The settlement proposed: how it splits the amount, its note, and where it stands now. */
function SettlementBody({ d, e }: EntryProps) {
  const p = d.proposals.find((x) => x.id === e.proposal);
  if (!p) return null;
  const STATE: Record<Proposal["state"], [string, "warn" | "ok" | "danger" | "neutral"]> = { open: ["Waiting for an answer", "warn"], accepted: ["Accepted", "ok"], declined: ["Declined", "danger"], replaced: ["Replaced by a newer proposal", "neutral"], void: ["Closed without an answer", "neutral"] };
  return (
    <>
      <Split d={d} p={p} />
      {p.note && <Quote>{p.note}</Quote>}
      <span className="self-start">
        <StatusDot tone={STATE[p.state][1]}>{STATE[p.state][0]}</StatusDot>
      </span>
    </>
  );
}

/** The deadline that ran out, and whose favor the case closed in. */
function MissedBody({ d, e }: EntryProps) {
  return e.due ? <p className="text-[13px] leading-[1.45] text-ink-2">The deadline was {stampOf(e.due)}, so the case closed in {partyName(d, otherParty(e.to ?? "independent"))}&apos;s favor.</p> : null;
}

/** Support's reasons for a ruling or a rejection. */
function RulingBody({ e }: EntryProps) {
  return e.text ? <Quote>{e.text}</Quote> : null;
}

/** What was released to the Independent, and where it came from. */
function ReleasedBody({ d }: EntryProps) {
  return <p className="text-[13px] leading-[1.45] text-ink-2">{usd(d.resolution?.moved ?? d.amount)} released {d.type === "trial" ? "from escrow" : "from the pay held for it"}.</p>;
}

/* ---------------------------------------------------------- settlement -- */

/** A proposal's two parts, and how the amount in question divides between them. */
function Split({ d, p }: { d: Dispute; p: Pick<Proposal, "refund" | "release"> }) {
  const share = d.amount > 0 ? (p.refund / d.amount) * 100 : 50;
  return (
    <div className="flex flex-col gap-2">
      {/* Each side's share in its colour: the company's refund blue, the Independent's release pink. */}
      <Meter
        parts={[
          { value: share, color: "var(--color-brand-blue)", label: "refund" },
          { value: 100 - share, color: "var(--color-brand-pink)", label: "release" },
        ]}
        label={`${usd(p.refund)} back to ${d.team.company}, ${usd(p.release)} to ${d.independent.name}`}
      />
      <dl className="grid grid-cols-2 gap-3 text-[13px] leading-[1.4]">
        <div className="flex flex-col gap-0.5">
          <dt className="text-ink-2">Back to {d.team.company}</dt>
          <dd className="text-[16px] font-semibold text-ink tabular-nums">{usd(p.refund)}</dd>
        </div>
        <div className="flex flex-col gap-0.5">
          <dt className="text-ink-2">To {d.independent.name}</dt>
          <dd className="text-[16px] font-semibold text-ink tabular-nums">{usd(p.release)}</dd>
        </div>
      </dl>
    </div>
  );
}

/** The settlement on the table: the other side accepts or declines; the proposer and support wait. */
function ProposalCard({ d, p, viewer, onToast }: { d: Dispute; p: Proposal; viewer: CaseViewer; onToast: SetToast }) {
  const receiver = otherParty(p.by);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const decide = async (accept: boolean) => {
    if (viewer === "admin") return;
    setBusy(true);
    try {
      const r = await answerSettlement(d.id, viewer, accept);
      setConfirming(false);
      onToast(r.ok ? (accept ? "Settled — the dispute is closed and the money has moved" : `Declined — ${partyName(d, p.by)} has been told`) : r.error, r.ok ? "success" : "danger");
    } finally {
      setBusy(false);
    }
  };
  return (
    <section aria-label="Settlement proposal" className="flex flex-col gap-3 rounded-lg bg-[#f7fbfe] p-4 outline -outline-offset-1 outline-accent-soft">
      <p className="text-[14px] leading-[1.4] font-semibold text-ink">{p.by === viewer ? "You proposed a settlement" : `${partyName(d, p.by)} proposed a settlement`}</p>
      <Split d={d} p={p} />
      {p.note && <Quote>{p.note}</Quote>}
      {viewer === receiver ? (
        <div className="flex flex-wrap items-center justify-end gap-2">
          <span className="mr-auto text-[12.5px] leading-[1.4] text-ink-2">Accepting closes the dispute and moves the money straight away.</span>
          <Button size="md" variant="danger" disabled={busy} onClick={() => void decide(false)}>
            Decline
          </Button>
          <Button size="md" variant="primary" disabled={busy} onClick={() => setConfirming(true)}>
            Accept
          </Button>
        </div>
      ) : (
        <p className="text-[13px] leading-[1.4] text-ink-2">Waiting on {partyName(d, receiver)} to accept or decline.</p>
      )}
      <Modal
        open={confirming}
        onClose={() => setConfirming(false)}
        title="Accept this settlement?"
        description={`The dispute closes and the money moves straight away: ${usd(p.refund)} back to ${d.team.company} and ${usd(p.release)} to ${d.independent.name}. This can't be undone.`}
        footer={
          <>
            <Button size="lg" onClick={() => setConfirming(false)}>
              Cancel
            </Button>
            <Button size="lg" variant="primary" disabled={busy} onClick={() => void decide(true)}>
              Accept settlement
            </Button>
          </>
        }
      />
    </section>
  );
}

/* ------------------------------------------------------------ replying -- */

function Composer({ d, side, now, mode, setMode, textRef, onToast }: { d: Dispute; side: DisputeParty; now: number; mode: "say" | "propose"; setMode: (m: "say" | "propose") => void; textRef: RefObject<HTMLTextAreaElement | null>; onToast: SetToast }) {
  const can = partyCan(d, side, now);
  if (!can.respond && !can.add && !can.propose) return null;
  return (
    <section id="reply" aria-label="Your reply" className="flex flex-col gap-4 rounded-lg bg-white p-4 outline -outline-offset-1 outline-border">
      <Pills
        aria-label="What to send"
        value={mode}
        onChange={setMode}
        options={[
          { value: "say", label: can.respond ? "Respond" : "Add information" },
          { value: "propose", label: "Propose a settlement" },
        ]}
      />
      {mode === "say" ? <SayForm d={d} side={side} respond={can.respond} textRef={textRef} onToast={onToast} /> : <ProposeForm d={d} side={side} onDone={() => setMode("say")} onToast={onToast} />}
    </section>
  );
}

/** A response (when it's their turn) or more for the case (when it isn't), with files and a link. */
function SayForm({ d, side, respond, textRef, onToast }: { d: Dispute; side: DisputeParty; respond: boolean; textRef: RefObject<HTMLTextAreaElement | null>; onToast: SetToast }) {
  const [text, setText] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [link, setLink] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const other = partyName(d, otherParty(side));
  const send = async () => {
    if (!text.trim()) return setError(respond ? "Write your response before sending it." : "Write something before sending it.");
    setBusy(true);
    setError(null);
    try {
      const attachments = await Promise.all(files.map(keepFile));
      const r = await (respond ? respondToDispute : addToDispute)(d.id, side, { text, attachments, link });
      if (!r.ok) return setError(r.error);
      setText("");
      setFiles([]);
      setLink("");
      onToast(respond ? "Response sent — Hireable support is reviewing the case" : `Added to the case — ${other} and Hireable support can read it`);
    } catch {
      setError("The files couldn't be saved in this browser. Try fewer or smaller ones.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="flex flex-col gap-3">
      <Field label={respond ? "Your response" : "What should Hireable support know?"} error={error ?? undefined}>
        <Textarea ref={textRef} rows={4} value={text} onChange={(e) => (setText(e.target.value), setError(null))} placeholder="Dates, what was agreed and what happened. Support checks it against the task log and the payments." maxLength={4000} />
      </Field>
      <div className="flex flex-col gap-2">
        <p className="text-[14px] leading-[1.2] font-semibold tracking-[0.2px] text-ink">Screenshots and files</p>
        <AttachmentPicker files={files} onChange={setFiles} onError={setError} />
      </div>
      <Field label="Link (optional)">
        <Input value={link} onChange={(e) => setLink(e.target.value)} placeholder="A document or thread that lives somewhere else" />
      </Field>
      <div className="flex flex-wrap items-center justify-end gap-3">
        <span className="mr-auto text-[12.5px] leading-[1.4] text-ink-2">{other} and Hireable support can read this.</span>
        <Button size="lg" variant="primary" disabled={busy} onClick={() => void send()}>
          {busy ? "Sending…" : respond ? "Send response" : "Add to the case"}
        </Button>
      </div>
    </div>
  );
}

/** How to split the amount in question — the other side accepts it to close the case. */
function ProposeForm({ d, side, onDone, onToast }: { d: Dispute; side: DisputeParty; onDone: () => void; onToast: SetToast }) {
  const { refund, release, note, setNote, busy, error, problem, setPart, preset, send } = useSettlementDraft(d, side, () => {
    onDone();
    onToast(`Proposal sent — ${partyName(d, otherParty(side))} can accept or decline`);
  });
  const half = Math.floor((d.amount * 100) / 2) / 100;
  return (
    <div className="flex flex-col gap-3">
      <p className="text-[13px] leading-[1.45] text-ink-2">
        Split the {usd(d.amount)} in question. If {partyName(d, otherParty(side))} accepts, the dispute closes and the money moves straight away.
      </p>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Quick splits">
        <Button size="sm" onClick={() => preset(d.amount)}>
          All back to {d.team.company}
        </Button>
        <Button size="sm" onClick={() => preset(half)}>
          Half each
        </Button>
        <Button size="sm" onClick={() => preset(0)}>
          All to {d.independent.name}
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
        <Field label={`Back to ${d.team.company}`}>
          <Input value={refund} inputMode="decimal" onChange={(e) => setPart("refund", e.target.value)} placeholder="0.00" />
        </Field>
        <Field label={`To ${d.independent.name}`}>
          <Input value={release} inputMode="decimal" onChange={(e) => setPart("release", e.target.value)} placeholder="0.00" />
        </Field>
      </div>
      <Field label="Note (optional)" error={error ?? problem ?? undefined}>
        <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Why this split is fair" maxLength={1000} />
      </Field>
      <div className="flex justify-end">
        <Button size="lg" variant="primary" disabled={busy || !!problem || !refund.trim() || !release.trim()} onClick={() => void send()}>
          {busy ? "Sending…" : "Send proposal"}
        </Button>
      </div>
    </div>
  );
}

/** A typed amount as a number: "$1,600.00" is 1600, and a blank field is NaN. */
const num = (s: string) => (s.trim() === "" ? NaN : Number(s.replace(/[$,\s]/g, "")));
/** A sum to the cent, as the split's fields show it: "800.00". */
const cents = (n: number) => (Math.round(n * 100) / 100).toFixed(2);

/**
 * A settlement being written: the two parts of the split, the note, what's wrong with the split, and
 * sending it — the fields empty and `onSent` runs once it's gone.
 */
function useSettlementDraft(d: Dispute, side: DisputeParty, onSent: () => void) {
  const [refund, setRefund] = useState("");
  const [release, setRelease] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Typing one part fills in the other, so the two always add up. */
  const setPart = (which: "refund" | "release", v: string) => {
    const n = num(v);
    const rest = Number.isFinite(n) && n >= 0 && n <= d.amount ? cents(d.amount - n) : "";
    if (which === "refund") {
      setRefund(v);
      setRelease(rest);
    } else {
      setRelease(v);
      setRefund(rest);
    }
    setError(null);
  };
  const preset = (r: number) => {
    setRefund(cents(r));
    setRelease(cents(d.amount - r));
    setError(null);
  };
  const problem = refund.trim() || release.trim() ? checkSplit(d.amount, num(refund), num(release)) : null;
  const send = async () => {
    const bad = checkSplit(d.amount, num(refund), num(release));
    if (bad) return setError(bad);
    setBusy(true);
    try {
      const r = await proposeSettlement(d.id, side, { refund: num(refund), release: num(release), note });
      if (!r.ok) return setError(r.error);
      setRefund("");
      setRelease("");
      setNote("");
      onSent();
    } finally {
      setBusy(false);
    }
  };
  return { refund, release, note, setNote, busy, error, problem, setPart, preset, send };
}

/* --------------------------------------------------------------- files -- */

/** Files chosen for a reply, before they're sent: previews, remove buttons, and room to add more. */
export function AttachmentPicker({ files, onChange, onError }: { files: File[]; onChange: (f: File[]) => void; onError: (m: string | null) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const add = (list: FileList | null) => {
    const picked = [...(list ?? [])];
    const bad = picked.map(checkCaseFile).find(Boolean) ?? null;
    const ok = picked.filter((f) => !checkCaseFile(f));
    const next = [...files, ...ok];
    onError(next.length > MAX_CASE_FILES ? `Up to ${MAX_CASE_FILES} files on one reply.` : bad);
    onChange(next.slice(0, MAX_CASE_FILES));
  };
  return (
    <div
      className={`flex flex-col gap-2 rounded-lg p-2 outline -outline-offset-1 ${over ? "bg-accent-bg outline-accent-soft" : "outline-transparent"}`}
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        add(e.dataTransfer.files);
      }}
    >
      <ul className="flex flex-wrap gap-2">
        {keyed(files, (f) => `${f.name}-${f.size}-${f.lastModified}`).map(({ item: f, key }) => (
          <li key={key}>
            <PickedFile file={f} onRemove={() => onChange(files.filter((g) => g !== f))} />
          </li>
        ))}
        {files.length < MAX_CASE_FILES && (
          <li>
            <button type="button" onClick={() => input.current?.click()} className="flex size-24 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border bg-white text-[12px] font-medium text-ink-2 hover:border-primary hover:text-primary focus-visible:outline-2 focus-visible:outline-primary">
              <ICONS.add size={20} aria-hidden />
              Add files
            </button>
          </li>
        )}
      </ul>
      <input
        ref={input}
        type="file"
        multiple
        accept={CASE_FILE_TYPES.join(",")}
        aria-label="Attach screenshots or PDFs"
        className="sr-only"
        onChange={(e) => {
          add(e.target.files);
          e.target.value = "";
        }}
      />
      <p className="text-[12px] leading-[1.4] text-ink-2">
        Screenshots or PDFs — drag them here or add them. Up to {MAX_CASE_FILES} files, {MAX_CASE_FILE_MB} MB each.
      </p>
    </div>
  );
}

/**
 * A picked image as a URL for its preview, made once it's on screen and let go when it leaves. Made
 * in an effect, not during render: Strict Mode's remount revoked the memoized URL and blanked the
 * preview.
 */
function usePreviewUrl(file: File | null): string | null {
  const [state, setState] = useState<{ file: File; url: string } | null>(null);
  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    // The URL is a browser resource made and let go here — the external system this effect syncs.
    // oxlint-disable-next-line react/set-state-in-effect
    setState({ file, url });
    return () => URL.revokeObjectURL(url);
  }, [file]);
  return state && state.file === file ? state.url : null;
}

function PickedFile({ file, onRemove }: { file: File; onRemove: () => void }) {
  const image = file.type.startsWith("image/");
  const url = usePreviewUrl(image ? file : null);
  return (
    <span className="relative flex size-24 flex-col items-center justify-center overflow-hidden rounded-lg bg-surface-2 outline -outline-offset-1 outline-border">
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element -- a local preview of a file that isn't saved anywhere yet
        url && <img src={url} alt={file.name} className="size-full object-cover" />
      ) : (
        <span className="flex flex-col items-center gap-1 px-2 text-center">
          <ICONS.pdf size={24} aria-hidden className="text-danger" />
          <span className="line-clamp-2 text-[11px] leading-[1.25] break-all text-ink-2">{file.name}</span>
        </span>
      )}
      <button type="button" onClick={onRemove} aria-label={`Remove ${file.name}`} className="absolute top-1 right-1 flex size-6 items-center justify-center rounded-full bg-white/90 text-ink shadow hover:bg-white focus-visible:outline-2 focus-visible:outline-primary">
        <ICONS.close size={14} aria-hidden />
      </button>
    </span>
  );
}

/** Files on the case: image thumbnails that open full size, PDFs that open in a new tab. */
function Attachments({ files }: { files: Attachment[] }) {
  return (
    <ul className="flex flex-wrap gap-2" aria-label="Attachments">
      {files.map((f) => (
        <li key={f.id}>
          <AttachmentTile file={f} />
        </li>
      ))}
    </ul>
  );
}

function AttachmentTile({ file }: { file: Attachment }) {
  const { url, missing } = useFileUrl(file.id);
  const [open, setOpen] = useState(false);
  const label = `${file.name} · ${sizeLabel(file.size)}`;
  if (missing)
    return (
      <span className="flex h-10 items-center gap-2 rounded-lg bg-surface-2 px-3 text-[12.5px] text-ink-2">
        <ICONS.document size={16} aria-hidden /> {file.name} — not in this browser
      </span>
    );
  if (file.type.startsWith("image/"))
    return (
      <>
        <button type="button" onClick={() => setOpen(true)} aria-label={`Open ${label}`} className="block size-24 overflow-hidden rounded-lg bg-surface-2 outline -outline-offset-1 outline-border hover:outline-[#a6a6a6] focus-visible:outline-2 focus-visible:outline-primary">
          {url && (
            // eslint-disable-next-line @next/next/no-img-element -- a file kept in this browser, shown from an object URL
            <img src={url} alt={file.name} className="size-full object-cover" />
          )}
        </button>
        <Modal open={open} onClose={() => setOpen(false)} title={file.name} width={960} closeButton>
          {url && (
            <div className="flex flex-col gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element -- a file kept in this browser, shown from an object URL */}
              <img src={url} alt={file.name} className="max-h-[calc(70vh/var(--ui-scale))] w-full rounded-lg bg-surface-2 object-contain" />
              <a href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 self-start text-[13px] font-semibold text-primary hover:underline">
                Open full size <ICONS.northEast size={16} aria-hidden />
              </a>
            </div>
          )}
        </Modal>
      </>
    );
  return (
    <a href={url ?? undefined} target="_blank" rel="noreferrer" aria-label={`Open ${label}`} className="flex h-10 max-w-[260px] items-center gap-2 rounded-lg bg-white px-3 text-[12.5px] text-ink outline -outline-offset-1 outline-border hover:outline-[#a6a6a6]">
      <ICONS.pdf size={18} aria-hidden className="shrink-0 text-danger" />
      <span className="truncate">{file.name}</span>
      <span className="shrink-0 text-ink-2">{sizeLabel(file.size)}</span>
    </a>
  );
}

/* --------------------------------------------------------------- money -- */

/** The amount, the contract's payments — paid, refunded, still held — and the contract itself. */
function CaseSide({ d, viewer }: { d: Dispute; viewer: CaseViewer }) {
  const deal = useDeal();
  const all = useDisputes();
  const live = useLive();
  const onDeal = dealContract(deal)?.key === d.contract;
  // A dispute about the trial moves the trial's escrow — even after the contract converts; one about
  // the role holds pay back instead (@/lib/demo/contract). The store decides it the same way.
  const escrow = onDeal && d.type === "trial" ? escrowOf(deal, all) : null;
  const facts = onDeal ? factsFor({ key: d.contract, links: d.links, title: d.title, type: d.type, rate: d.rate, started: d.facts.started, ends: d.facts.ends }, deal, all) : d.facts;
  const rows = live.payments.filter((p) => p.contract === d.links.independent || p.contract === d.links.team);
  const contractHref = contractHrefFor(d, viewer, onDeal);
  return (
    // The same side column as a contract's tabs: a third of the width, 340–440px.
    <aside className={SIDE_COLUMN}>
      <PanelCard title="Amount in question">
        <p className="font-display text-[28px] leading-[1.2] font-semibold text-ink tabular-nums" style={{ fontVariationSettings: '"opsz" 14' }}>
          {usd(d.amount)}
        </p>
        <p className="text-[13px] leading-[1.45] text-ink-2">
          {d.reason} · {whereItStands(d, !!escrow, onDeal)}
        </p>
      </PanelCard>
      <PaymentsPanel d={d} escrow={escrow} rows={rows} />
      <PanelCard title="Contract">
        <dl className="flex flex-col gap-2 text-[13px] leading-[1.4]">
          <Line k="Contract" v={contractName(d)} />
          <Line k="Runs" v={`${facts.started} – ${facts.ends}`} />
          <Line k="Rate" v={d.rate} />
          <Line k="Tasks approved" v={facts.tasksTotal ? `${facts.tasksDone} of ${facts.tasksTotal}` : "No tasks on record"} />
        </dl>
        {contractHref && (
          <Link href={contractHref} className="inline-flex items-center gap-1.5 self-start text-[13px] font-semibold text-primary hover:underline">
            Open the contract <ICONS.northEast size={16} aria-hidden />
          </Link>
        )}
      </PanelCard>
    </aside>
  );
}

/** Where the amount in question stands: held while the case is open, then wherever the ruling sent it. */
function whereItStands(d: Dispute, inEscrow: boolean, onDeal: boolean): string {
  if (d.status === "Pending") {
    if (inEscrow) return "Held in escrow until the case closes.";
    return onDeal ? "Kept back from the pay until the case closes." : "In question until the case closes.";
  }
  const r = d.resolution;
  if (r?.payment === "split" && r.split) return `${usd(r.split.refund)} back to ${d.team.company} · ${usd(r.split.release)} to ${d.independent.name}`;
  if (r?.payment === "refunded") return `Refunded to ${d.team.company}.`;
  if (r?.payment === "released") return `Released to ${d.independent.name}.`;
  if (r?.payment === "awaiting release") return `To be released to ${d.independent.name}.`;
  return "The hold was lifted.";
}

/** Where "Open the contract" goes: the viewer's own contract page, or Admin's for the live one. */
function contractHrefFor(d: Dispute, viewer: CaseViewer, onDeal: boolean): string | null {
  if (viewer === "team") return `/team/independents/${d.links.team}?tab=contract`;
  if (viewer === "independent") return `/independent/contracts/${d.links.independent}?tab=contract`;
  return onDeal ? `/admin/contracts/${d.links.independent}` : null;
}

/** The contract's money: what the trial's escrow was funded with and where it went — or, on a role, the payments recorded. */
function PaymentsPanel({ d, escrow, rows }: { d: Dispute; escrow: ReturnType<typeof escrowOf>; rows: LivePayment[] }) {
  const sum = (list: LivePayment[]) => list.reduce((n, p) => n + (Number(p.amount.replace(/[^0-9.]/g, "")) || 0), 0);
  const paid = sum(rows.filter((p) => p.kind !== "refunded"));
  const refunded = sum(rows.filter((p) => p.kind === "refunded"));
  return (
    <PanelCard title="Payments on this contract">
      <dl className="flex flex-col gap-2 text-[13px] leading-[1.4]">
        {escrow && <Line k="Escrow funded" v={usd(escrow.total)} />}
        <Line k={`Paid to ${d.independent.name.split(" ")[0]}`} v={usd(escrow ? escrow.released : paid)} />
        <Line k={`Refunded to ${d.team.company}`} v={usd(escrow ? escrow.refunded : refunded)} />
        {escrow && <Line k="Pending — still in escrow" v={usd(escrow.held)} strong />}
        {escrow && escrow.onHold > 0 && <Line k="On hold for disputes" v={usd(escrow.onHold)} />}
      </dl>
      {rows.length > 0 ? (
        <ul className="flex flex-col border-t border-border pt-2">
          {rows.map((p) => (
            <li key={p.id} className="flex items-center gap-2 py-1.5 text-[12.5px] leading-[1.35]">
              <span className="w-[76px] shrink-0 text-ink-2">{p.date}</span>
              <span className="min-w-0 flex-1 truncate text-ink">{p.kind === "refunded" ? `Refunded · ${p.period}` : `Released · ${p.period}`}</span>
              <span className="shrink-0 font-medium text-ink tabular-nums">{p.amount}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-[12.5px] leading-[1.4] text-ink-2">{escrow ? "Nothing has been paid out of escrow yet." : "No payments recorded on this contract yet."}</p>
      )}
    </PanelCard>
  );
}

function Line({ k, v, strong = false }: { k: string; v: string; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-ink-2">{k}</dt>
      <dd className={`text-right tabular-nums ${strong ? "font-semibold text-ink" : "text-ink"}`}>{v}</dd>
    </div>
  );
}
