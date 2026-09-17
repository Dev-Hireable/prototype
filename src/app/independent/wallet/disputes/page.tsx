"use client";

import { useState } from "react";
import { Button, EmptyState, Field, Modal, Page, SearchBox, Select, StatusDot, Toast, useToast } from "@/components/independent/ui";
import { Row, Table, Toolbar } from "@/components/team/ui";
import { move, PAIR } from "@/lib/demo/live";
import type { Dispute } from "@/lib/independent/data";
import { useDemo } from "@/lib/independent/store";

/** Columns: Filed 110 · Contract flex · Company 180 · Reason 190 · Status 150 · Actions 160. */
const COLS = ["w-[110px]", "min-w-0 flex-1", "w-[180px]", "w-[190px]", "w-[150px]", "w-[160px]"];

/**
 * IN-080 / IN-081 / IN-082 — every dispute the independent has filed, across every contract.
 * The list is the store's, so one filed from a contract tracker shows up here, and withdrawing
 * here shows up there.
 */
export default function SentDisputes() {
  const { disputes, contracts, withdrawDispute } = useDemo();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("All statuses");
  const [viewing, setViewing] = useState<Dispute | null>(null);
  const [withdrawing, setWithdrawing] = useState<Dispute | null>(null);
  const [toast, setToast] = useToast();

  const contractOf = (d: Dispute) => contracts.find((c) => c.slug === d.contract);
  const name = (d: Dispute) => contractOf(d)?.title ?? d.contract;
  const company = (d: Dispute) => contractOf(d)?.company ?? "—";
  /** Newest first: the store prepends, so filing order is already the order to read them in. */
  const rows = disputes.filter((d) => (status === "All statuses" || d.status.label === status) && `${name(d)} ${company(d)} ${d.reason}`.toLowerCase().includes(q.trim().toLowerCase()));
  const pending = disputes.filter((d) => d.status.label === "Pending review").length;

  return (
    <Page title="Sent disputes">
      <Toolbar
        right={
          <span className="text-[14px] leading-[1.4] text-ink-2">
            {disputes.length === 1 ? "1 dispute" : `${disputes.length} disputes`} · {pending} pending review
          </span>
        }
      >
        <SearchBox value={q} onChange={setQ} placeholder="Search by contract or company" className="w-[320px]" />
        <Select options={["All statuses", "Pending review", "In review", "Resolved", "Withdrawn"]} value={status} onChange={(e) => setStatus(e.target.value)} className="!w-[180px]" />
      </Toolbar>

      {disputes.length === 0 ? (
        <EmptyState title="No disputes filed" body="If a payment goes wrong on a contract, file a dispute from that contract's Contract & Payment tab and it is listed here." />
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
        <Table cols={COLS} head={["Filed", "Contract", "Company", "Reason", "Status", "Actions"]}>
          {rows.map((d) => (
            <Row key={d.id}>
              <span className={`${COLS[0]} text-ink-2`}>{d.filed}</span>
              <span className={`${COLS[1]} truncate text-[14px]`}>{name(d)}</span>
              <span className={`${COLS[2]} truncate`}>{company(d)}</span>
              <span className={`${COLS[3]} truncate text-ink-2`}>{d.reason}</span>
              <span className={COLS[4]}>
                <StatusDot tone={d.status.tone}>{d.status.label}</StatusDot>
              </span>
              <span className={`${COLS[5]} flex gap-2`}>
                <Button size="sm" onClick={() => setViewing(d)}>
                  View
                </Button>
                {/* IN-082 — withdrawing is only offered while it is still Pending review. */}
                {d.status.label === "Pending review" && (
                  <Button size="sm" onClick={() => setWithdrawing(d)}>
                    Withdraw
                  </Button>
                )}
              </span>
            </Row>
          ))}
        </Table>
      )}

      <p className="text-[12.5px] leading-[1.5] text-muted">
        Hireable reviews disputes for process compliance only — whether the agreed steps were followed — not for the subjective quality of the work. Most are resolved within 5 working days.
      </p>

      {/* IN-081 — everything that was filed, plus the admin's ruling once there is one. Read-only. */}
      <Modal
        open={!!viewing}
        onClose={() => setViewing(null)}
        title={`Dispute · ${viewing ? name(viewing) : ""}`}
        description={viewing ? `Filed ${viewing.filed} · ${viewing.amount} · ${viewing.reason}` : undefined}
        footer={
          <Button size="lg" onClick={() => setViewing(null)}>
            Close
          </Button>
        }
      >
        {viewing && (
          <div className="flex flex-col gap-3">
            <dl className="flex flex-col gap-2 rounded-lg bg-[#fafafa] p-4 text-[13px] leading-[1.45] outline -outline-offset-1 outline-border">
              {(
                [
                  ["Date filed", viewing.filed],
                  ["Contract", name(viewing)],
                  ["Company", company(viewing)],
                  ["Reason", viewing.reason],
                  ["Amount in question", viewing.amount],
                  ["Supporting evidence", viewing.evidence ?? "None attached"],
                  ["Status", viewing.status.label],
                ] as const
              ).map(([k, v]) => (
                <div key={k} className="flex gap-4">
                  <span className="w-[150px] shrink-0 text-ink-2">{k}</span>
                  <span className="min-w-0 flex-1 text-ink">{v}</span>
                </div>
              ))}
            </dl>
            <Field label="Description">
              <p className="rounded-lg bg-white p-4 text-[14px] leading-[1.45] text-ink outline -outline-offset-1 outline-border">{viewing.description}</p>
            </Field>
            {viewing.resolution ? (
              <Field label="Admin resolution">
                <div className="flex flex-col gap-2 rounded-lg bg-[#f3faf6] p-4 outline -outline-offset-1 outline-[#bfe3cc]">
                  <p className="text-[14px] leading-[1.4] font-semibold text-ink">{viewing.resolution.outcome}</p>
                  <p className="text-[13.5px] leading-[1.5] text-ink-2">{viewing.resolution.notes}</p>
                </div>
              </Field>
            ) : (
              <p className="text-[13px] leading-[1.45] text-ink-2">
                {viewing.status.label === "Withdrawn"
                  ? "You withdrew this dispute, so the process check stopped. It stays on file and the contract cannot be disputed again."
                  : "Hireable support is checking the objective log and the agreed process steps. The outcome and the reviewer’s notes appear here once a decision is made."}
              </p>
            )}
          </div>
        )}
      </Modal>

      {/* IN-082 — confirm first; withdrawing cannot be undone and closes the contract to new disputes. */}
      <Modal
        open={!!withdrawing}
        onClose={() => setWithdrawing(null)}
        tone="danger"
        title="Withdraw this dispute?"
        description="The process check stops and Hireable support is told. The dispute stays on file as Withdrawn, and you cannot file another one for this contract."
        footer={
          <>
            <Button size="lg" onClick={() => setWithdrawing(null)}>
              Keep it open
            </Button>
            <Button
              size="lg"
              variant="danger"
              onClick={() => {
                if (withdrawing) {
                  withdrawDispute(withdrawing.id);
                  // The Team Builder hears about it too, not just Hireable support.
                  if (contractOf(withdrawing)?.manager === PAIR.team.name) move("dispute_pulled", { slug: withdrawing.contract, title: name(withdrawing) });
                }
                setWithdrawing(null);
                setToast("Dispute withdrawn — Hireable support and the company have been notified");
              }}
            >
              Withdraw dispute
            </Button>
          </>
        }
      />
      <Toast message={toast} onClose={() => setToast(null)} />
    </Page>
  );
}
