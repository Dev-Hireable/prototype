"use client";

import Link from "next/link";
import { useState } from "react";
import { ICONS } from "@/components/admin/icons";
import { Button, EmptyState, JobBadge, LinkButton, Modal, Page, SearchBox, Select, StatusDot, Toast, useToast } from "@/components/independent/ui";
import { KebabMenu, MenuAction, MenuLink } from "@/components/portal/controls";
import { Tip } from "@/components/portal/Tip";
import { Person, Row, Table, Toolbar } from "@/components/team/ui";
import { hoursLabel } from "@/lib/demo/job-types";
import { byName } from "@/lib/team/data";
import type { Offer } from "@/lib/team/data";
import { useDemo } from "@/lib/team/store";
import { ReturnNav } from "@/components/portal/return";

const Edit = ICONS.edit;
const Undo = ICONS.undo;

/**
 * Candidate · Role (the title with its type badge, on one line) · Terms (the pay over its dates or
 * hours) · Status (over when it was sent) · Actions. The role gets the spare width rather than the
 * candidate: it used to be cut to "Customer Support …" with its badge stacked underneath while the
 * candidate column sat half empty. Each cell leads with what matters and keeps a quieter second line.
 */
const COLS = ["w-[200px]", "min-w-[200px] flex-1", "w-[190px]", "w-[136px]", "w-[64px]"];

/** "12 Oct 2026" → "12 Oct": an offer starts within weeks, and a trial's end date carries the year. */
const dayMonth = (d: string) => d.replace(/\s\d{4}$/, "");

/** What the pay covers: a trial's dates, or when an ongoing role starts and — part-time — its hours. */
const termsOf = (o: Offer) => (o.type === "trial" ? (o.end ? `${dayMonth(o.start)} – ${o.end}` : `From ${o.start}`) : `From ${dayMonth(o.start)}${o.hours ? ` · ${hoursLabel(o.hours)}` : ""}`);

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
      {offers.length === 0 ? (
        <EmptyState
          title="No offers sent yet"
          body="When you send a candidate an offer from their proposal, it shows up here until they answer."
          action={
            <LinkButton href="/team/hire/roles" variant="primary" size="lg">
              Go to your roles
            </LinkButton>
          }
        />
      ) : (
        <Table cols={COLS} head={["Candidate", "Role", "Terms", "Status", ""]}>
          {list.map((o) => {
            const p = byName(o.independent);
            const open = o.status.label === "Pending";
            // The offer a proposal was answered with can be edited; the post-trial offer is withdrawn and sent again instead.
            const editable = open && !o.conversion;
            return (
              <Row key={o.id}>
                <span className={COLS[0]}>
                  <Person name={p.name} role={p.role} avatar={p.avatar} href={`/team/discover/${p.slug}`} />
                </span>
                <span className={`${COLS[1]} flex flex-col justify-center gap-0.5 !items-start`}>
                  <span className="flex max-w-full items-center gap-2">
                    {o.href ? (
                      <Link href={o.href} className="min-w-0 truncate text-[14px] font-medium text-ink hover:text-primary hover:underline">
                        {o.role}
                      </Link>
                    ) : (
                      <span className="min-w-0 truncate text-[14px] font-medium text-ink">{o.role}</span>
                    )}
                    <JobBadge type={o.type} />
                  </span>
                  {/* TB-072 — the offer that follows a trial, beside the one a proposal was answered with. */}
                  {o.conversion && <span className="text-[12px] leading-[1.3] text-ink-2">After the trial</span>}
                </span>
                <span className={`${COLS[2]} flex flex-col justify-center gap-0.5 !items-start`}>
                  <span className="text-[14px] font-medium text-ink">{o.rate}</span>
                  <span className="max-w-full truncate text-[12px] leading-[1.3] text-ink-2">{termsOf(o)}</span>
                </span>
                <span className={`${COLS[3]} flex flex-col justify-center gap-1 !items-start`}>
                  <StatusDot tone={o.status.tone}>{o.status.label}</StatusDot>
                  {/* IN-075 — the talent's reason travels with the answer; otherwise, when it went out. */}
                  {o.declineReason ? (
                    <Tip label={`“${o.declineReason}”`}>
                      <span tabIndex={0} className="max-w-full cursor-help truncate text-[12px] leading-[1.3] text-ink-2">
                        “{o.declineReason}”
                      </span>
                    </Tip>
                  ) : (
                    <span className="text-[12px] leading-[1.3] text-ink-2">Sent {o.sent}</span>
                  )}
                </span>
                <span className={`${COLS[4]} flex justify-center`}>
                  {open ? (
                    <KebabMenu label={`Actions for the offer to ${p.name}`} iconSize={20} menuWidth={232} buttonClassName="!size-7">
                      {editable ? (
                        <MenuLink href={`/team/hire/offers/${o.id}/edit`} icon={<Edit size={18} aria-hidden />}>
                          Edit offer
                        </MenuLink>
                      ) : (
                        <MenuAction disabled icon={<Edit size={18} aria-hidden />} title="Withdraw it and send a new one to change a post-trial offer">
                          Edit offer
                        </MenuAction>
                      )}
                      <MenuAction destructive onClick={() => setWithdrawing(o)} icon={<Undo size={18} aria-hidden />}>
                        Withdraw offer
                      </MenuAction>
                    </KebabMenu>
                  ) : (
                    // An answered or withdrawn offer has nothing left to do.
                    <span className="text-ink-2" aria-label="No actions">
                      —
                    </span>
                  )}
                </span>
              </Row>
            );
          })}
        </Table>
      )}
      {offers.length > 0 && list.length === 0 && <p className="text-[14px] leading-[1.4] text-ink-2">No offers match these filters.</p>}

      <Modal
        open={!!withdrawing}
        onClose={() => setWithdrawing(null)}
        tone="danger"
        title="Withdraw this offer?"
        description={`${withdrawing ? byName(withdrawing.independent).name : "The candidate"} is told the offer was withdrawn and can no longer accept it. ${withdrawing?.conversion ? "Their contract is unchanged." : "Their proposal stays on file, so you can send a new offer from it."}`}
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
