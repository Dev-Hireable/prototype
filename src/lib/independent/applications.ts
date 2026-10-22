"use client";

import { useMemo } from "react";
import type { Stage } from "@/lib/portal/stages";
import { trialClosed } from "@/lib/contract/lifecycle";
import { dayLabel, isoDay, momentLabel, slotOffset, today } from "@/lib/portal/dates";
import { canMessage, clearDeal, consumeInvite, contractTypeOf, fillPosting, getInvites, lifecycleOfDeal, readDeal, stageOf, startDeal, updateDeal, useDeal, useInvites, withProposalEvent } from "@/lib/demo/deal";
import type { Deal, DealProposal } from "@/lib/demo/deal";
import { JOB_TYPE_LABEL } from "@/lib/contract/job-types";
import { move, PAIR, persisted, useStored } from "@/lib/demo/live";
import type { MoveKind } from "@/lib/demo/live";
import { taskFromOffer } from "@/lib/demo/tasks";
import { applications as seedApps, interviews as seedInterviews } from "./data";
import type { Application, Interview } from "./data";

/*
 * The independent's applications and the interviews booked on them. The live one comes off the
 * shared engagement (@/lib/demo/deal), the record the Team Builder's tracker reads; the rest are seed.
 */

const applicationsStore = persisted("ind.applications", seedApps);
const withdrawnStore = persisted<string[]>("ind.withdrawn", []);
/** Roles whose Team Builder declined this talent's proposal. A new application replaces that record, so this is what keeps the role from being applied to again. */
const declinedStore = persisted<string[]>("ind.declined", []);
/** Applications the talent withdrew, as they stood: they stay on the board under Closed. */
const closedStore = persisted<Application[]>("ind.closed", []);

/** The one id both portals use for the shared engagement. */
const DEAL_ID = "deal";

/** Stages the sheet says the Team Builder hears about, and which movement that is. */
const STAGE_MOVE = {
  invite_accepted: "interview_accepted",
  proposal_sent: "proposal_sent",
  hired: "offer_accepted",
} as const;

/** A signed offer can't be withdrawn — the contract behind it is ended, or disputed, instead. */
const withdrawable = (stage: Stage) => stage !== "offer_accepted" && stage !== "hired";

/**
 * A signed contract's status: a trial reads as the trial (#131), and "Hired" is kept for a full-time
 * or part-time role, straight on or after the trial.
 */
function hiredStatus(deal: Deal): NonNullable<Application["status"]> {
  const type = contractTypeOf(deal);
  if (type !== "trial") return deal.contract?.ended ? { label: "Contract ended", tone: "neutral" } : { label: `Hired · ${JOB_TYPE_LABEL[type].toLowerCase()}`, tone: "ok" };
  if (deal.conversion?.status === "sent") return { label: `${JOB_TYPE_LABEL[deal.conversion.type]} offer received`, tone: "ok" };
  const l = lifecycleOfDeal(deal);
  if (deal.contract?.ended || (l && trialClosed(l))) return { label: "Trial ended", tone: "neutral" };
  return l?.phase === "starts" ? { label: `Trial starts ${dayLabel(l.since)}`, tone: "info" } : { label: "Trial started", tone: "ok" };
}

/** The interview's status, with its slot to read in each clock: a time the talent asked for was picked in theirs. */
function interviewStatus(deal: Deal): Application["status"] {
  const iv = deal.interview;
  const slot = iv && { when: iv.when, offset: iv.offset };
  if (deal.stage === "interviewed") return { label: "Interview completed", tone: "ok", slot };
  if (!iv || !slot) return undefined;
  // IN-092 / TB-037 — a declined or cancelled slot says so until a new one is offered.
  if (iv.outcome === "declined") return { label: "Interview declined", tone: "danger", slot };
  if (iv.outcome === "cancelled") return { label: "Interview cancelled", tone: "neutral", slot };
  if (iv.outcome === "reschedule") return { label: "New time requested", tone: "warn", slot: iv.requested && { when: iv.requested.when, offset: iv.requested.offset, theirs: slotOffset(iv.when, iv.offset) } };
  return iv.accepted ? { label: "Interview confirmed", tone: "info", slot } : { label: "Interview invitation", tone: "warn", slot };
}

/** The talent's status line for the deal, most advanced fact first. */
function dealStatus(deal: Deal): Application["status"] {
  if (deal.stage === "hired") return hiredStatus(deal);
  if (deal.proposalDeclined) return { label: "Proposal declined", tone: "danger", meta: deal.proposalDeclined.date };
  // TB-044 — dropped by the company: not notified, but the application says where it stands rather
  // than carrying on as if it were still being reviewed. Undropping brings the stage's status back.
  if (deal.dropped) return { label: "Not moving forward", tone: "neutral" };
  if (deal.offer?.status === "declined") return { label: "Offer declined", tone: "danger" };
  if (deal.offer?.status === "withdrawn") return { label: "Offer withdrawn", tone: "neutral" };
  if (deal.offer?.status === "sent") return { label: "Offer received", tone: "ok" };
  if (deal.revision) return { label: "Revision requested", tone: "warn", meta: deal.revision.date };
  if (deal.stage === "proposal_sent" && deal.proposal) return { label: "Proposal submitted", tone: "info", meta: `v${deal.proposal.version} · ${deal.proposal.sent}` };
  if (deal.stage === "proposal_requested") return { label: "Proposal requested", tone: "warn" };
  return interviewStatus(deal);
}

/** The applications: the deal's card — the talent's side of the one engagement — first. */
function applicationsOf(deal: Deal | null, applications: Application[]): Application[] {
  if (!deal) return applications;
  const card: Application = {
    id: DEAL_ID,
    roleSlug: deal.roleSlug,
    title: deal.title,
    company: deal.company,
    match: deal.match,
    submitted: `${deal.invited ? "Invited" : "Submitted"} ${deal.submitted}`,
    stage: stageOf(deal),
    status: dealStatus(deal),
    // #132 — turned down by the Team Builder (declined, its proposal included): Closed, until they restore it.
    closed: released(deal),
  };
  return [card, ...applications];
}

/** IN-070 — interviews the Team Builder has booked on the shared engagement, then the seed's. */
function interviewsOf(deal: Deal | null): Interview[] {
  if (!deal?.interview) return seedInterviews;
  const live: Interview = {
    id: DEAL_ID,
    role: deal.title,
    roleHref: `/independent/jobs/applications/${DEAL_ID}`,
    company: deal.company,
    when: deal.interview.when,
    offset: deal.interview.offset,
    format: deal.interview.format,
    link: deal.interview.link,
    status: deal.interview.outcome === "done" ? "completed" : (deal.interview.outcome ?? (deal.interview.accepted ? "accepted" : "starts")),
    past: deal.interview.past,
  };
  return [live, ...seedInterviews];
}

const applicationsNow = () => applicationsOf(readDeal(), applicationsStore.get());

/**
 * Turned down before any hire (dropped, or its proposal declined): it no longer holds the talent. A
 * talent whose proposal was declined is free to apply elsewhere; they used to stay locked to that
 * engagement until they "withdrew" an application the Team Builder had already turned down. A plain
 * drop is silent (the talent is not told), so it keeps the lock rather than giving itself away.
 */
const released = (deal: Deal | null) => !!deal?.dropped && !deal.contract;

/**
 * `notify` overrides which notification fires: omitted infers it from the stage, `false` stays
 * silent, and a kind names it outright.
 */
function setStage(id: string, stage: Stage, status?: Application["status"], notify?: MoveKind | false) {
  const app = applicationsNow().find((x) => x.id === id);
  if (id === DEAL_ID) {
    const d = readDeal();
    // IN-074 — only an open offer can be signed; a declined or withdrawn one stays that way.
    // Nothing moves on an application the company has dropped (TB-044).
    if (!d || d.dropped || (stage === "hired" && d.offer?.status !== "sent")) return;
    const kind = notify === undefined ? STAGE_MOVE[stage as keyof typeof STAGE_MOVE] : notify || undefined;
    if (kind && app) move(kind, { slug: app.roleSlug, title: app.title });
    // The shared engagement moves in the shared store, so the Team Builder's tracker moves with it.
    updateDeal((x) => {
      // IN-070 — confirming is what the Team Builder's schedule reads as Confirmed.
      if (stage === "invite_accepted" && x.interview) return { ...x, stage, interview: { ...x.interview, accepted: true } };
      if (stage !== "hired" || !x.offer) return { ...x, stage };
      // IN-074 — accepting starts the contract the offer was for: its agreed tasks become the
      // list both trackers work from (due weeks turned into dates), and a trial holds the escrow
      // funded with the offer. A full-time or part-time offer starts that contract directly.
      const o = x.offer;
      const trial = o.type === "trial";
      return {
        ...x,
        stage,
        offer: { ...o, status: "accepted" },
        contract: x.contract ?? {
          started: o.start,
          ends: trial ? o.end : undefined,
          rate: o.rate,
          hours: o.type === "part-time" ? o.hours : undefined,
          benefits: o.type === "full-time" ? o.benefits : undefined,
          deposit: trial ? o.deposit?.escrow : undefined,
          tasks: o.tasks.map((t, i) => taskFromOffer(t, i, o.start, { trialEnd: trial ? o.end : undefined, created: today(), name: PAIR.team.name })),
          nextNumber: o.tasks.length + 1,
          activity: [],
          streak: 0,
        },
      };
    });
    // IN-074 — the hire takes the role's seat; a full posting leaves the job board.
    if (stage === "hired" && app) fillPosting(app.roleSlug);
    return;
  }
  const kind = notify === undefined ? STAGE_MOVE[stage as keyof typeof STAGE_MOVE] : notify || undefined;
  if (kind && app) move(kind, { slug: app.roleSlug, title: app.title });
  applicationsStore.set((a) => a.map((x) => (x.id === id ? { ...x, stage, status: status ?? x.status } : x)));
}

/**
 * IN-074 — signing: the offer is accepted under the name the talent typed (their account's, checked
 * by the sign card) on today's date, and its contract starts. Only an open offer can be signed.
 */
function acceptOffer(id: string, name: string) {
  if (id !== DEAL_ID || readDeal()?.offer?.status !== "sent") return;
  setStage(id, "hired", { label: "Waiting to start", tone: "ok" });
  updateDeal((x) => (x.offer?.status === "accepted" ? { ...x, offer: { ...x.offer, signed: { name: name.trim().replace(/\s+/g, " "), on: today() } } } : x));
}

/** IN-075 — the reason, if one is given, goes to the Team Builder with the answer. */
function declineOffer(id: string, reason?: string) {
  if (id !== DEAL_ID) return;
  const d = readDeal();
  if (!d?.offer || d.offer.status !== "sent") return;
  move("offer_declined", { slug: d.roleSlug, title: d.title });
  updateDeal((x) => (x.offer ? { ...x, offer: { ...x.offer, status: "declined", declineReason: reason?.trim() || undefined } } : x));
}

/** A closed application has nothing left to withdraw. */
const canWithdraw = (app: Application) => !app.closed && withdrawable(app.stage);

/** #132 — a withdrawn application stays on the board under Closed, as it stood, with nothing on it to act on. */
function keepClosed(app: Application) {
  withdrawnStore.set((slugs) => (slugs.includes(app.roleSlug) ? slugs : [...slugs, app.roleSlug]));
  closedStore.set((all) => [{ ...app, id: `closed-${app.roleSlug}-${Date.now()}`, closed: true, status: { label: "Withdrawn", tone: "neutral" } }, ...all]);
}

/** Refused (false) once an offer has been accepted (a signed contract is ended, not withdrawn) or the Team Builder has closed it. */
function withdraw(id: string): boolean {
  const app = applicationsNow().find((x) => x.id === id);
  if (!app || !canWithdraw(app)) return false;
  move("withdrawn", { slug: app.roleSlug, title: app.title });
  keepClosed(app);
  if (id === DEAL_ID) clearDeal();
  else applicationsStore.set((a) => a.filter((x) => x.id !== id));
  return true;
}

/** IN-017 — false when it can't go: applied or withdrawn already, or engaged on another role. */
function apply(roleSlug: string, title: string, company: string, match: number, extras?: { note?: string; quiz?: boolean }): boolean {
  const deal = readDeal();
  // IN-017: cannot apply twice — unless the company invited them to apply again (TB-017).
  const invited = !!getInvites()[roleSlug];
  if (!invited && (withdrawnStore.get().includes(roleSlug) || declinedStore.get().includes(roleSlug))) return false;
  if (applicationsNow().some((x) => x.roleSlug === roleSlug && !(x.id === DEAL_ID && released(deal)))) return false;
  // IN-017 — applying starts the engagement the Team Builder sees in their candidate tracker. A
  // declined one no longer holds the talent, so the new application takes its place.
  if (released(deal) && deal) {
    const declinedRole = deal.roleSlug;
    if (declinedRole !== roleSlug) declinedStore.set((slugs) => (slugs.includes(declinedRole) ? slugs : [...slugs, declinedRole]));
    clearDeal();
  }
  const started = startDeal({ roleSlug, title, company, match, submitted: today(), note: extras?.note?.trim() || undefined, quiz: extras?.quiz });
  if (started) {
    move("applied", { slug: roleSlug, title });
    if (invited) {
      consumeInvite(roleSlug);
      declinedStore.set((slugs) => slugs.filter((s) => s !== roleSlug));
      withdrawnStore.set((slugs) => slugs.filter((s) => s !== roleSlug));
    }
  }
  return started;
}

/** IN-072 / IN-073 — only while a proposal is actually requested; false otherwise. */
function submitProposal(id: string, proposal: Omit<DealProposal, "version" | "sent">): boolean {
  if (id !== DEAL_ID) return false;
  const d = readDeal();
  // Only an open request can be answered — the wizard used to reach the deal at any stage and
  // move a signed, even ended, contract back to "Proposal submitted".
  if (!d || d.stage !== "proposal_requested" || d.dropped) return false;
  if (!proposal.start || proposal.start < isoDay()) return false;
  // The thread says which version it is: past the first, a resubmission.
  move("proposal_sent", { slug: d.roleSlug, title: d.title }, { version: (d.proposal?.version ?? 0) + 1 });
  updateDeal((x) => {
    const sent: DealProposal = { ...proposal, version: (x.proposal?.version ?? 0) + 1, sent: today() };
    // TB-106 — each version stays on the history, so the Team Builder can read it against the last.
    return { ...withProposalEvent(x, { kind: "proposal", at: momentLabel(), proposal: sent }), stage: "proposal_sent", proposal: sent, revision: undefined };
  });
  return true;
}

/** An interview the talent can still answer: booked, not held, and not already turned down. */
const answerable = (deal: Deal | null): deal is Deal & { interview: NonNullable<Deal["interview"]> } => !!deal?.interview && !deal.interview.past && (deal.stage === "invited" || deal.stage === "invite_accepted");

/**
 * IN-092 — declining keeps the application open and tells the Team Builder. It goes back to
 * Invited: a confirmed slot declined used to stay Confirmed, so the Team Builder could mark it held
 * and carry on to the proposal and the contract.
 */
function declineInterview(id: string) {
  const deal = readDeal();
  if (id !== DEAL_ID || !answerable(deal)) return;
  move("interview_declined", { slug: deal.roleSlug, title: deal.title });
  updateDeal((d) => (d.interview ? { ...d, stage: "invited", interview: { ...d.interview, past: true, accepted: false, outcome: "declined", requested: undefined } } : d));
}

/**
 * IN-093 — can't make the slot: the talent names the one they can, and the Team Builder confirms
 * it or offers another. Like a decline, nothing moves on until a new slot is agreed. Also open
 * after a decline, so turning one down isn't the end of the interview. The slot was picked in the
 * talent's own clock, `offset` minutes off UTC, so the Team Builder reads it in theirs.
 */
function requestReschedule(id: string, when: string, note?: string, offset?: number) {
  const deal = readDeal();
  const declined = deal?.interview?.outcome === "declined" || deal?.interview?.outcome === "reschedule";
  if (id !== DEAL_ID || !deal?.interview || deal.dropped || !(answerable(deal) || (declined && deal.stage === "invited"))) return;
  move("interview_reschedule", { slug: deal.roleSlug, title: deal.title }, { note: when });
  updateDeal((d) => (d.interview ? { ...d, stage: "invited", interview: { ...d.interview, past: true, accepted: false, outcome: "reschedule", requested: { when, note: note?.trim() || undefined, offset } } } : d));
}

export function useApplications() {
  const deal = useDeal();
  const stored = useStored(applicationsStore);
  const withdrawn = useStored(withdrawnStore);
  const declined = useStored(declinedStore);
  const closed = useStored(closedStore);
  /** Roles the company invited them to apply to — which reopens a role that turned them down. */
  const invites = useInvites();
  const applications = useMemo(() => applicationsOf(deal, stored), [deal, stored]);
  const interviews = useMemo(() => interviewsOf(deal), [deal]);
  const withdrawnRoleSlugs = useMemo(() => withdrawn.filter((s) => !invites[s]), [withdrawn, invites]);
  const declinedRoleSlugs = useMemo(() => declined.filter((s) => !invites[s]), [declined, invites]);
  return {
    applications,
    /** #132 — applications the talent withdrew, kept under Closed; the board shows them after the live ones. */
    withdrawnApplications: closed,
    /** IN-006 — true from the application on (Messages also lists the thread from an invite to apply). */
    canChat: canMessage(deal),
    /**
     * The engagement already on file. The demo holds one at a time, so while it exists no other role
     * can be applied to — applying used to overwrite it, contract and payment history included.
     */
    engagement: deal && !released(deal) ? { roleSlug: deal.roleSlug, title: deal.title, company: deal.company, withdrawable: withdrawable(deal.stage) } : null,
    withdrawnRoleSlugs,
    declinedRoleSlugs,
    interviews,
    setStage,
    acceptOffer,
    declineOffer,
    withdraw,
    canWithdraw,
    apply,
    submitProposal,
    declineInterview,
    requestReschedule,
  };
}
