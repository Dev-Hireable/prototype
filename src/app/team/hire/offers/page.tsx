"use client";

import Link from "next/link";
import { useState } from "react";
import { ICONS } from "@/components/admin/icons";
import { Button, EmptyState, JobBadge, LinkButton, Modal, Page, SearchBox, Select, StatusDot, Toast } from "@/components/independent/ui";
import { KebabMenu, MenuAction } from "@/components/portal/controls";
import { Tip } from "@/components/portal/Tip";
import { Person, Row, Table, Toolbar } from "@/components/team/ui";
import { hoursLabel } from "@/lib/demo/job-types";
import { useToast, type SetToast } from "@/lib/portal/toast";
import { byName } from "@/lib/team/data";
import type { Offer } from "@/lib/team/data";
import { useOffers } from "@/lib/team/offers";
import { ReturnNav } from "@/components/portal/return";

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

/** Offers sent; Edit opens the full-page "Edit sent offer". */
export default function OffersSent() {
  const { offers, withdrawOffer } = useOffers();
  const filters = useOfferFilters(offers);
  const [withdrawing, setWithdrawing] = useState<Offer | null>(null);
  const [toast, setToast] = useToast();
  const { list } = filters;

  return (
    <Page title="Offers sent" nav={<ReturnNav />}>
      <OffersToolbar offers={offers} filters={filters} />
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
          {list.map((o) => (
            <OfferRow key={o.id} o={o} onWithdraw={setWithdrawing} />
          ))}
        </Table>
      )}
      {offers.length > 0 && list.length === 0 && <p className="text-[14px] leading-[1.4] text-ink-2">No offers match these filters.</p>}

      <WithdrawDialog offer={withdrawing} onClose={() => setWithdrawing(null)} onWithdraw={withdrawOffer} onToast={setToast} />
      <Toast toast={toast} onClose={() => setToast(null)} />
    </Page>
  );
}

/** The search and the role and status filters, and the offers they leave. */
function useOfferFilters(offers: Offer[]) {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("All statuses");
  /** The roles actually on these offers — it listed three seed roles that no offer belonged to, and filtered nothing. */
  const [roleFilter, setRoleFilter] = useState("All roles");
  const roleOptions = ["All roles", ...new Set(offers.map((o) => o.role))];
  const list = offers.filter(
    (o) => (status === "All statuses" || o.status.label === status) && (roleFilter === "All roles" || o.role === roleFilter) && `${byName(o.independent).name} ${o.role}`.toLowerCase().includes(q.toLowerCase()),
  );
  return { q, setQ, status, setStatus, roleFilter, setRoleFilter, roleOptions, list };
}

type OfferFilters = ReturnType<typeof useOfferFilters>;

/** The search and the two filters, with how many offers are out and how many still wait on an answer. */
function OffersToolbar({ offers, filters }: { offers: Offer[]; filters: OfferFilters }) {
  const { q, setQ, status, setStatus, roleFilter, setRoleFilter, roleOptions } = filters;
  const pending = offers.filter((o) => o.status.label === "Pending").length;
  return (
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
  );
}

/** One offer: the candidate, the role, the terms, where it stands, and — while it's pending — its menu. */
function OfferRow({ o, onWithdraw }: { o: Offer; onWithdraw: (o: Offer) => void }) {
  const p = byName(o.independent);
  const open = o.status.label === "Pending";
  return (
    <Row>
      <span className={COLS[0]}>
        <Person name={p.name} role={p.role} avatar={p.avatar} href={`/team/discover/${p.slug}`} />
      </span>
      <RoleCell o={o} />
      <span className={`${COLS[2]} flex flex-col justify-center gap-0.5 !items-start`}>
        <span className="text-[14px] font-medium text-ink">{o.rate}</span>
        <span className="max-w-full truncate text-[12px] leading-[1.3] text-ink-2">{termsOf(o)}</span>
      </span>
      <StatusCell o={o} />
      <span className={`${COLS[4]} flex justify-center`}>
        {open ? (
          <OfferMenu o={o} name={p.name} onWithdraw={onWithdraw} />
        ) : (
          // An answered or withdrawn offer has nothing left to do.
          <span className="text-ink-2" aria-label="No actions">
            —
          </span>
        )}
      </span>
    </Row>
  );
}

/** The role's title — a link when it has a page — with its type badge, and a note under a post-trial offer. */
function RoleCell({ o }: { o: Offer }) {
  return (
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
  );
}

/** Where the offer stands, over the talent's reason for turning it down or the day it was sent. */
function StatusCell({ o }: { o: Offer }) {
  return (
    <span className={`${COLS[3]} flex flex-col justify-center gap-1 !items-start`}>
      <StatusDot tone={o.status.tone}>{o.status.label}</StatusDot>
      {/* IN-075 — the talent's reason travels with the answer; otherwise, when it went out. */}
      {o.declineReason ? (
        <Tip label={`“${o.declineReason}”`}>
          {/* react-doctor-disable-next-line react-doctor/no-noninteractive-tabindex -- focusable so a keyboard can open the tip with the whole reason */}
          <span tabIndex={0} className="max-w-full cursor-help truncate text-[12px] leading-[1.3] text-ink-2">
            “{o.declineReason}”
          </span>
        </Tip>
      ) : (
        <span className="text-[12px] leading-[1.3] text-ink-2">Sent {o.sent}</span>
      )}
    </span>
  );
}

/**
 * A pending offer's one action: withdrawing it. Its terms were settled in the proposal before it went
 * out, so it isn't edited — changing them takes a proposal revision and a new offer (TB-106).
 */
function OfferMenu({ o, name, onWithdraw }: { o: Offer; name: string; onWithdraw: (o: Offer) => void }) {
  return (
    <KebabMenu label={`Actions for the offer to ${name}`} iconSize={20} menuWidth={232} buttonClassName="!size-7">
      <MenuAction destructive onClick={() => onWithdraw(o)} icon={<Undo size={18} aria-hidden />}>
        Withdraw offer
      </MenuAction>
    </KebabMenu>
  );
}

/** Withdrawing a pending offer, once confirmed: the candidate is told and can no longer accept it. */
function WithdrawDialog({ offer, onClose, onWithdraw, onToast }: { offer: Offer | null; onClose: () => void; onWithdraw: (id: string) => void; onToast: SetToast }) {
  return (
    <Modal
      open={!!offer}
      onClose={onClose}
      tone="danger"
      title="Withdraw this offer?"
      description={`${offer ? byName(offer.independent).name : "The candidate"} is told the offer was withdrawn and can no longer accept it. ${offer?.conversion ? "Their contract is unchanged." : "Their proposal stays on file, so you can send a new offer from it."}`}
      footer={
        <>
          <Button size="lg" onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="lg"
            variant="danger"
            onClick={() => {
              // It used to patch a status the shared offer never read: the talent could still accept it.
              if (offer) onWithdraw(offer.id);
              onClose();
              onToast("Offer withdrawn");
            }}
          >
            Withdraw offer
          </Button>
        </>
      }
    />
  );
}
