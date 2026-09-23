"use client";

import { useState } from "react";
import { Button, LinkButton, Modal, Page, SearchBox, Select, StatusDot, Toast, useToast } from "@/components/independent/ui";
import { Tip } from "@/components/portal/Tip";
import { Person, Row, Table, Toolbar } from "@/components/team/ui";
import { byName } from "@/lib/team/data";
import type { Offer } from "@/lib/team/data";
import { useDemo } from "@/lib/team/store";
import { ReturnNav } from "@/components/portal/return";

/** Figma columns: Candidate flex · Role 170 · Sent 100 · Rate 130 · Start date 105 · Status 105 · Actions 170. */
const COLS = ["min-w-0 flex-1", "w-[170px]", "w-[100px]", "w-[130px]", "w-[105px]", "w-[105px]", "w-[170px]"];

/** Figma "Hire / Offers sent · list / Withdraw sent offer · confirm"; Edit opens the full-page "Edit sent offer". */
export default function OffersSent() {
  const { offers, withdrawOffer } = useDemo();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("All statuses");
  /** The roles actually on these offers — it listed three seed roles that no offer belonged to, and filtered nothing. */
  const [roleFilter, setRoleFilter] = useState("All roles");
  const [withdrawing, setWithdrawing] = useState<Offer | null>(null);
  const [toast, setToast] = useToast();
  const roleOptions = ["All roles", ...new Set(offers.map((o) => o.role))];
  const list = offers.filter(
    (o) => (status === "All statuses" || o.status.label === status) && (roleFilter === "All roles" || o.role === roleFilter) && `${byName(o.independent).name} ${o.role}`.toLowerCase().includes(q.toLowerCase()),
  );
  const pending = offers.filter((o) => o.status.label === "Pending").length;

  return (
    <Page title="Offers sent" nav={<ReturnNav />}>
      <Toolbar
        right={
          <span className="text-[14px] leading-[1.4] text-ink-2">
            {offers.length === 1 ? "1 offer" : `${offers.length} offers`} · {pending} pending
          </span>
        }
      >
        <SearchBox value={q} onChange={setQ} placeholder="Search offers" className="w-[320px]" />
        <Select options={roleOptions} value={roleOptions.includes(roleFilter) ? roleFilter : "All roles"} onChange={(e) => setRoleFilter(e.target.value)} className="!w-[180px]" />
        <Select options={["All statuses", "Pending", "Accepted", "Declined", "Withdrawn"]} value={status} onChange={(e) => setStatus(e.target.value)} className="!w-[160px]" />
      </Toolbar>
      <Table cols={COLS} head={["Candidate", "Role", "Sent", "Rate", "Start date", "Status", "Actions"]}>
        {list.map((o) => {
          const p = byName(o.independent);
          const open = o.status.label === "Pending";
          // A sent trial offer can be edited; a full-time offer is withdrawn and sent again instead.
          const editable = open && o.kind !== "full-time";
          return (
            <Row key={o.id}>
              <span className={COLS[0]}>
                <Person name={p.name} role={p.role} avatar={p.avatar} href={`/team/discover/${p.slug}`} />
              </span>
              <span className={`${COLS[1]} text-[14px]`}>{o.role}</span>
              <span className={`${COLS[2]} text-ink-2`}>{o.sent}</span>
              <span className={`${COLS[3]} text-[14px]`}>{o.rate}</span>
              <span className={`${COLS[4]} text-ink-2`}>{o.start}</span>
              <span className={`${COLS[5]} flex flex-col items-start gap-1`}>
                <StatusDot tone={o.status.tone}>{o.status.label}</StatusDot>
                {/* IN-075 — the talent's reason travels with the answer. */}
                {o.declineReason && <span className="text-[11.5px] leading-[1.3] text-ink-2">“{o.declineReason}”</span>}
              </span>
              <span className={`${COLS[6]} flex gap-2`}>
                {editable ? (
                  <LinkButton size="sm" href={`/team/hire/offers/${o.id}/edit`}>
                    Edit
                  </LinkButton>
                ) : (
                  <Tip label={o.kind === "full-time" && open ? "Withdraw it and send a new one to change a full-time offer" : "Only a pending offer can be edited"} wrap>
                    <Button size="sm" disabled>
                      Edit
                    </Button>
                  </Tip>
                )}
                <Button size="sm" disabled={!open} onClick={() => setWithdrawing(o)}>
                  Withdraw
                </Button>
              </span>
            </Row>
          );
        })}
      </Table>

      <Modal
        open={!!withdrawing}
        onClose={() => setWithdrawing(null)}
        tone="danger"
        title="Withdraw this offer?"
        description={`${withdrawing ? byName(withdrawing.independent).name : "The candidate"} is told the offer was withdrawn and can no longer accept it. ${withdrawing?.kind === "full-time" ? "Their contract is unchanged." : "Their proposal stays on file, so you can send a new offer from it."}`}
        footer={
          <>
            <Button size="lg" onClick={() => setWithdrawing(null)}>
              Cancel
            </Button>
            <Button
              size="lg"
              variant="danger"
              onClick={() => {
                // It used to patch a status the shared offer never read: the talent could still accept it.
                if (withdrawing) withdrawOffer(withdrawing.id);
                setWithdrawing(null);
                setToast("Offer withdrawn");
              }}
            >
              Withdraw offer
            </Button>
          </>
        }
      />
      <Toast message={toast} onClose={() => setToast(null)} />
    </Page>
  );
}
