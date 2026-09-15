"use client";

import { useState } from "react";
import { Button, Modal, Page, SearchBox, Select, StatusDot, Toast, useToast } from "@/components/independent/ui";
import { Person, Row, Table, Toolbar } from "@/components/team/ui";
import { disputes as seed } from "@/lib/team/data";
import type { Dispute } from "@/lib/team/data";

/** Figma columns: Independent 198 · Contract 176 · Filed 100 · Amount 120 · Reason 120 · Status 140 · Actions 150. */
const COLS = ["w-[198px]", "w-[176px]", "w-[100px]", "w-[120px]", "w-[120px]", "w-[140px]", "w-[150px]"];

/** Figma "Payments / Sent disputes". */
export default function Disputes() {
  const [q, setQ] = useState("");
  const [items, setItems] = useState(seed);
  const [viewing, setViewing] = useState<Dispute | null>(null);
  const [withdrawing, setWithdrawing] = useState<Dispute | null>(null);
  const [toast, setToast] = useToast();
  const rows = items.filter((d) => `${d.name} ${d.contract}`.toLowerCase().includes(q.toLowerCase()));
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
        <SearchBox value={q} onChange={setQ} placeholder="Search disputes" className="w-[320px]" />
        <Select options={["All contracts", "Trial", "Full-time"]} className="!w-[180px]" />
        <Select options={["All statuses", "Pending review", "In review", "Resolved"]} className="!w-[160px]" />
      </Toolbar>
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
              {d.open && (
                <Button size="sm" onClick={() => setWithdrawing(d)}>
                  Withdraw
                </Button>
              )}
            </span>
          </Row>
        ))}
      </Table>
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
        <p className="rounded-lg bg-[#fafafa] p-4 text-[14px] leading-[1.4] text-ink outline -outline-offset-1 outline-border">Hireable support is checking the objective log and the agreed process steps. You will hear back in the thread with support once a decision is made.</p>
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
            <Button size="lg" variant="danger" onClick={() => { setItems((all) => all.map((d) => (d.id === withdrawing?.id ? { ...d, open: false, status: { label: "Withdrawn", tone: "neutral" } } : d))); setWithdrawing(null); setToast("Dispute withdrawn"); }}>
              Withdraw dispute
            </Button>
          </>
        }
      />
      <Toast message={toast} onClose={() => setToast(null)} />
    </Page>
  );
}
