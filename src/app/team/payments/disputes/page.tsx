"use client";

import { useState } from "react";
import { Button, EmptyState, Field, Modal, Page, SearchBox, Select, StatusDot, Toast, useToast } from "@/components/independent/ui";
import { move, PAIR } from "@/lib/demo/live";
import { Person, Row, Table, Toolbar } from "@/components/team/ui";
import type { Dispute } from "@/lib/team/data";
import { useDemo } from "@/lib/team/store";

/** Figma columns: Independent 198 · Contract 176 · Filed 100 · Amount 120 · Reason 120 · Status 140 · Actions 150. */
const COLS = ["w-[198px]", "w-[176px]", "w-[100px]", "w-[120px]", "w-[120px]", "w-[140px]", "w-[150px]"];

/** Figma "Payments / Sent disputes". */
export default function Disputes() {
  const [q, setQ] = useState("");
  /* TB-118 — from the store, so a dispute filed on a tracker shows up here. */
  const { disputes: items, setDispute } = useDemo();
  const [viewing, setViewing] = useState<Dispute | null>(null);
  const [withdrawing, setWithdrawing] = useState<Dispute | null>(null);
  const [toast, setToast] = useToast();
  const [status, setStatus] = useState("All statuses");
  /* TB-091 — newest first; the seed is already in order, so id order stands in for filed order. */
  const rows = items.filter((d) => (status === "All statuses" || d.status.label === status) && `${d.name} ${d.contract}`.toLowerCase().includes(q.trim().toLowerCase()));
  const pending = items.filter((d) => d.status.label === "Pending review").length;

  return (
    <Page title="Sent disputes">
      <Toolbar
        right={
          <span className="text-[14px] leading-[1.4] text-ink-2">
            {items.length} disputes · {pending} pending review
          </span>
        }
      >
        <SearchBox value={q} onChange={setQ} placeholder="Search by independent or contract" className="w-[320px]" />
        <Select options={["All statuses", "Pending review", "In review", "Resolved", "Withdrawn"]} value={status} onChange={(e) => setStatus(e.target.value)} className="!w-[180px]" />
      </Toolbar>
      {items.length === 0 ? (
        <EmptyState title="No disputes filed" body="If something goes wrong on a contract, file a dispute from that independent's tracker and it will be listed here." />
      ) : rows.length === 0 ? (
        <EmptyState title="No disputes match" body="Try a different status, or clear the search to see all of them." action={<Button size="lg" variant="primary" onClick={() => { setQ(""); setStatus("All statuses"); }}>Clear filters</Button>} />
      ) : (
      <Table cols={COLS} head={["Independent", "Contract", "Filed", "Amount", "Reason", "Status", "Actions"]}>
        {rows.map((d) => (
          <Row key={d.id}>
            <span className={COLS[0]}>
              <Person name={d.name} role={d.role} avatar={d.avatar} />
            </span>
            <span className={`${COLS[1]} text-[14px]`}>{d.contract}</span>
            <span className={`${COLS[2]} text-ink-2`}>{d.filed}</span>
            <span className={`${COLS[3]} text-[14px]`}>{d.amount}</span>
            <span className={`${COLS[4]} text-ink-2`}>{d.reason}</span>
            <span className={COLS[5]}>
              <StatusDot tone={d.status.tone}>{d.status.label}</StatusDot>
            </span>
            <span className={`${COLS[6]} flex gap-2`}>
              <Button size="sm" onClick={() => setViewing(d)}>
                View
              </Button>
              {/* TB-093 — withdrawing is only offered while it is still Pending review. */}
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
      <p className="text-[12.5px] leading-[1.5] text-muted">Hireable reviews disputes for process compliance only — whether the agreed steps were followed — not for the subjective quality of the work. Most are resolved within 5 working days.</p>

      <Modal
        open={!!viewing}
        onClose={() => setViewing(null)}
        title={`Dispute · ${viewing?.contract ?? ""}`}
        description={`Filed ${viewing?.filed} · ${viewing?.amount} · ${viewing?.reason}`}
        footer={
          <Button size="lg" onClick={() => setViewing(null)}>
            Close
          </Button>
        }
      >
        {/* TB-092 — everything that was filed, plus the admin's ruling once there is one. Read-only. */}
        {viewing && (
          <div className="flex flex-col gap-3">
            <dl className="flex flex-col gap-2 rounded-lg bg-[#fafafa] p-4 text-[13px] leading-[1.45] outline -outline-offset-1 outline-border">
              {(
                [
                  ["Independent", viewing.name],
                  ["Contract", viewing.contract],
                  ["Date filed", viewing.filed],
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
              <p className="text-[13px] leading-[1.45] text-ink-2">Hireable support is checking the objective log and the agreed process steps. The outcome and the reviewer’s notes appear here once a decision is made.</p>
            )}
          </div>
        )}
      </Modal>
      <Modal
        open={!!withdrawing}
        onClose={() => setWithdrawing(null)}
        tone="danger"
        title="Withdraw this dispute?"
        description="The review stops and the held amount is released to the independent. You cannot file again for the same payment."
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
                  setDispute(withdrawing.id, { open: false, status: { label: "Withdrawn", tone: "neutral" } });
                  // TB-093 — the independent hears about it too, not just Hireable support.
                  if (withdrawing.name === PAIR.independent.name) move("dispute_withdrawn", { slug: withdrawing.id, title: withdrawing.contract });
                }
                setWithdrawing(null);
                setToast("Dispute withdrawn — Hireable support and the independent have been notified");
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
