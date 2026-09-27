"use client";

import { useMemo } from "react";
import type { Stage } from "@/components/independent/ui";
import { trialClosed } from "@/lib/contract/lifecycle";
import { dayLabel, isoDay, momentLabel, today } from "@/lib/demo/dates";
import { canMessage, clearDeal, consumeInvite, contractTypeOf, fillPosting, getInvites, lifecycleOfDeal, proposalSource, readDeal, stageOf, startDeal, updateDeal, useDeal, useInvites, withProposalEvent } from "@/lib/demo/deal";
import type { Deal, DealProposal } from "@/lib/demo/deal";
import { JOB_TYPE_LABEL } from "@/lib/demo/job-types";
import { move, PAIR, persisted, sendChat, sendFile, useStored } from "@/lib/demo/live";
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

/** The talent's status line for the deal, most advanced fact first. */
function dealStatus(deal: Deal): Application["status"] {
  if (deal.stage === "hired") {
    const type = contractTypeOf(deal);
    if (type !== "trial") return deal.contract?.ended ? { label: "Contract ended", tone: "neutral" } : { label: `Hired · ${JOB_TYPE_LABEL[type].toLowerCase()}`, tone: "ok" };
    if (deal.conversion?.status === "sent") return { label: `${JOB_TYPE_LABEL[deal.conversion.type]} offer received`, tone: "ok" };
    const l = lifecycleOfDeal(deal);
    if (deal.contract?.ended || (l && trialClosed(l))) return { label: "Trial ended", tone: "neutral" };
    return l?.phase === "starts" ? { label: `Starts ${dayLabel(l.since)}`, tone: "info" } : { label: "Hired · trial running", tone: "ok" };
  }
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
  if (deal.stage === "interviewed") return { label: "Interview completed", tone: "ok", meta: deal.interview?.when };
  // IN-071 / TB-037 — a declined or cancelled slot says so until a new one is offered.
  if (deal.interview?.outcome === "declined") return { label: "Interview declined", tone: "danger", meta: deal.interview.when };
  if (deal.interview?.outcome === "cancelled") return { label: "Interview cancelled", tone: "neutral", meta: deal.interview.when };
  if (deal.interview?.accepted) return { label: "Interview confirmed", tone: "info", meta: deal.interview.when };
  if (deal.interview) return { label: "Interview invitation", tone: "warn", meta: deal.interview.when };
  return undefined;
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

/** IN-075 — the reason, if one is given, goes to the Team Builder with the answer. */
function declineOffer(id: string, reason?: string) {
  if (id !== DEAL_ID) return;
  const d = readDeal();
  if (!d?.offer || d.offer.status !== "sent") return;
  move("offer_declined", { slug: d.roleSlug, title: d.title });
  updateDeal((x) => (x.offer ? { ...x, offer: { ...x.offer, status: "declined", declineReason: reason?.trim() || undefined } } : x));
}

const canWithdraw = (app: Application) => withdrawable(app.stage);

/** Refused (false) once an offer has been accepted: a signed contract is ended, not withdrawn. */
function withdraw(id: string): boolean {
  if (id === DEAL_ID) {
    const d = readDeal();
    if (!d || !withdrawable(d.stage)) return false;
    move("withdrawn", { slug: d.roleSlug, title: d.title });
    withdrawnStore.set((slugs) => (slugs.includes(d.roleSlug) ? slugs : [...slugs, d.roleSlug]));
    clearDeal();
    return true;
  }
  const app = applicationsNow().find((x) => x.id === id);
  if (!app || !withdrawable(app.stage)) return false;
  move("withdrawn", { slug: app.roleSlug, title: app.title });
  withdrawnStore.set((slugs) => (slugs.includes(app.roleSlug) ? slugs : [...slugs, app.roleSlug]));
  applicationsStore.set((a) => a.filter((x) => x.id !== id));
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
  move("proposal_sent", { slug: d.roleSlug, title: d.title });
  updateDeal((x) => {
    const sent: DealProposal = { ...proposal, version: (x.proposal?.version ?? 0) + 1, sent: today() };
    // TB-106 — each version stays on the history, so the Team Builder can read it against the last.
    return { ...withProposalEvent(x, { kind: "proposal", at: momentLabel(), proposal: sent }), stage: "proposal_sent", proposal: sent, revision: undefined };
  });
  return true;
}

/** TB-106 — a note on the proposal's history; it goes to the thread too, so the Team Builder reads it either way. */
function commentOnProposal(text: string, file?: File) {
  const body = file ? `Sent an attachment: ${file.name}` : text.trim();
  const source = proposalSource(readDeal());
  if (!body || !source) return;
  // It goes to the thread too, marked as written on the proposal so the inbox links back to it.
  // The chat message's id, so the note shows the same sent / seen receipt as the thread.
  const chatId = file ? sendFile("independent", file, source) : sendChat("independent", body, source);
  updateDeal((x) => withProposalEvent(x, { kind: "comment", at: momentLabel(), by: "independent", text: body, chatId }));
}

/** IN-071 — declining keeps the application open and tells the Team Builder. */
function declineInterview(id: string) {
  const deal = readDeal();
  if (id !== DEAL_ID || !deal) return;
  move("interview_declined", { slug: deal.roleSlug, title: deal.title });
  updateDeal((d) => (d.interview ? { ...d, interview: { ...d.interview, past: true, accepted: false, outcome: "declined" } } : d));
}

export function useApplications() {
  const deal = useDeal();
  const stored = useStored(applicationsStore);
  const withdrawn = useStored(withdrawnStore);
  const declined = useStored(declinedStore);
  /** Roles the company invited them to apply to — which reopens a role that turned them down. */
  const invites = useInvites();
  const applications = useMemo(() => applicationsOf(deal, stored), [deal, stored]);
  const interviews = useMemo(() => interviewsOf(deal), [deal]);
  const withdrawnRoleSlugs = useMemo(() => withdrawn.filter((s) => !invites[s]), [withdrawn, invites]);
  const declinedRoleSlugs = useMemo(() => declined.filter((s) => !invites[s]), [declined, invites]);
  return {
    applications,
    /** IN-006 — false until the company invites them to interview; there is no thread before that. */
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
    declineOffer,
    withdraw,
    canWithdraw,
    apply,
    submitProposal,
    commentOnProposal,
    declineInterview,
  };
}
