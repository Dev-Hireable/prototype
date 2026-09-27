"use client";

import Link from "next/link";
import { notFound } from "next/navigation";
import { use, useEffect } from "react";
import { AdminPage, DataTable, StatCard, StatGrid } from "@/components/admin/ui";
import { ICONS } from "@/components/admin/icons";
import { Button, Toast } from "@/components/independent/ui";
import { DisputeCase } from "@/components/portal/DisputeCase";
import { BreadcrumbBack } from "@/components/portal/nav";
import { useWithReturn } from "@/components/portal/return";
import { useDeal, useHydrated } from "@/lib/demo/deal";
import type { Deal } from "@/lib/demo/deal";
import { dealContract, escrowOf, factsFor, isOpen, markAdminSeen, otherParty, partyName, partyTurn, usd, useDisputes, waitingOn } from "@/lib/demo/disputes";
import type { Dispute, DisputeFacts } from "@/lib/demo/disputes";
import type { PartyTurn } from "@/lib/disputes/case";
import { useToast } from "@/lib/portal/toast";
import { useNow } from "@/lib/portal/use-now";
import { AskDialog, ExtendDialog, RejectDialog, ReleaseDialog, ResolveDialog } from "./_components/Dialogs";
import { amountNote, clockNote, processChecks, roleOf, waitingLabel } from "./_lib/copy";
import type { Check } from "./_lib/copy";
import { useSupportDialogs } from "./_lib/dialogs";
import type { Dialog } from "./_lib/dialogs";

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
  const [toast, setToast] = useToast();
  const dialogs = useSupportDialogs(setToast);
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

  const onLiveContract = dealContract(deal)?.key === d.contract;
  const refundable = refundableOf(d, deal, all, onLiveContract);
  const checks = processChecks(d, factsOf(d, deal, all, onLiveContract));
  const turn = partyTurn(d);
  const open = isOpen(d);
  const awaitingRelease = d.resolution?.payment === "awaiting release";

  return (
    <AdminPage
      nav={<BreadcrumbBack href="/admin/disputes">Back to all disputes</BreadcrumbBack>}
      title={`${d.reason} · ${d.title}`}
      actions={open || awaitingRelease ? <SupportActions open={open} turn={turn} onOpen={dialogs.setDialog} /> : undefined}
    >
      <div className="flex flex-col gap-4">
        <CaseStats d={d} turn={turn} open={open} now={now} />

        <DisputeCase dispute={d} viewer="admin" onToast={setToast} />

        <ProcessCheck checks={checks} workHref={onLiveContract ? withReturn(`/admin/contracts/${d.links.independent}`) : null} />
      </div>

      <AskDialog d={d} dialogs={dialogs} />
      <ExtendDialog d={d} turn={turn} dialogs={dialogs} />
      <RejectDialog d={d} dialogs={dialogs} />
      <ResolveDialog d={d} refundable={refundable} dialogs={dialogs} />
      <ReleaseDialog d={d} amount={refundable} dialogs={dialogs} />
      <Toast toast={toast} onClose={() => setToast(null)} />
    </AdminPage>
  );
}

/**
 * Support's moves in the header, when there's one to make: while the case is open, ask a side or
 * give them more time, reject or rule; once it's closed for the independent, pay it out.
 */
function SupportActions({ open, turn, onOpen }: { open: boolean; turn: PartyTurn | null; onOpen: (dialog: Dialog) => void }) {
  if (!open) {
    return (
      <Button size="sm" variant="primary" onClick={() => onOpen("release")}>
        Request payment release
      </Button>
    );
  }
  return (
    <>
      {/* One side at a time: asking hands them the turn, with its own deadline. */}
      {!turn && <Button size="sm" onClick={() => onOpen("ask")}>Ask a party</Button>}
      {turn && <Button size="sm" onClick={() => onOpen("extend")}>Extend deadline</Button>}
      <Button size="sm" variant="danger" onClick={() => onOpen("reject")}>
        Reject
      </Button>
      <Button size="sm" variant="primary" onClick={() => onOpen("resolve")}>
        Resolve
      </Button>
    </>
  );
}

/** The case at a glance: who raised it against whom, the money in question and where it is, and whose move it is. */
function CaseStats({ d, turn, open, now }: { d: Dispute; turn: PartyTurn | null; open: boolean; now: number }) {
  const other = otherParty(d.filedBy);
  return (
    <StatGrid>
      <StatCard label="Raised by" value={partyName(d, d.filedBy)} sub={roleOf(d.filedBy)} />
      <StatCard label="Against" value={partyName(d, other)} sub={roleOf(other)} />
      <StatCard label="Amount in question" value={usd(d.amount)} sub={amountNote(d)} />
      <StatCard label="Waiting on" value={waitingLabel(d, waitingOn(d))} sub={clockNote(d, turn, open, now)} />
    </StatGrid>
  );
}

/**
 * The process check — compliance, not work quality — and, when the dispute is on the live contract,
 * the way into that contract's work (`workHref`).
 */
function ProcessCheck({ checks, workHref }: { checks: Check[]; workHref: string | null }) {
  return (
    <>
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
      {workHref && (
        <Link href={workHref} className="inline-flex items-center gap-1.5 self-start text-[13px] font-semibold text-accent hover:underline">
          Open the contract&apos;s work <ICONS.northEast size={16} aria-hidden />
        </Link>
      )}
    </>
  );
}

/** The facts the process check reads: the live contract's as they stand now, else the ones filed with the dispute. */
function factsOf(d: Dispute, deal: Deal | null, all: Dispute[], onLiveContract: boolean): DisputeFacts {
  return onLiveContract ? factsFor({ key: d.contract, links: d.links, title: d.title, type: d.type, rate: d.rate, started: d.facts.started, ends: d.facts.ends }, deal, all) : d.facts;
}

/**
 * What a ruling for the company would refund: never more than the trial's escrow still holds, for a
 * dispute about the trial (even after a conversion — the store goes by the dispute, not the
 * contract). One about the role is capped by its amount: what the pay held doesn't cover comes off
 * the next pay.
 */
function refundableOf(d: Dispute, deal: Deal | null, all: Dispute[], onLiveContract: boolean) {
  const cap = onLiveContract && d.type === "trial" ? escrowOf(deal, all)?.held : undefined;
  return Math.min(d.amount, cap ?? d.amount);
}
