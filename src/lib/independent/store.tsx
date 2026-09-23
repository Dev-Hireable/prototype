"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { Stage } from "@/components/independent/ui";
import { dayLabel, dayStamp, momentLabel, reviewQuarter, sinceOrFrom, today } from "@/lib/demo/dates";
import { activityOf, canMessage, clearDeal, evaluationsOf, fillPosting, fitScoreOf, getDeal, isFullTime, keyResultPercent, objectiveFrom, stageOf, startDeal, trialStateOf, updateDeal, useDeal, withLog } from "@/lib/demo/deal";
import type { ContractObjective, Deal, DealProposal } from "@/lib/demo/deal";
import { escrowOf, getDisputes, usd } from "@/lib/demo/disputes";
import { markRead as markLiveRead, move, recordPayment, useLive, usePersisted } from "@/lib/demo/live";
import type { MoveKind } from "@/lib/demo/live";
import { INITIAL_SAVED, applications as seedApps, contracts as seedContracts, interviews as seedInterviews, ME, payoutMethods as seedPayouts, profile as seedProfile, tagsFor, transactions as seedTransactions, WORK_STYLE_ANSWERS } from "./data";
import type { Application, Contract, Interview, Notification, PayoutMethod, Transaction } from "./data";

/**
 * Demo state for the Independent pages, so a button on one screen is visible on another
 * (save a role → Saved roles; accept an invitation → pipeline; add a payout method → Wallet).
 * Persisted to localStorage; notifications and chat live in @/lib/demo/live because the Team
 * Builder portal sees them too.
 * ponytail: plain state in a context; swap for a real API client when one exists.
 */
type Demo = {
  saved: string[];
  toggleSaved: (slug: string) => void;
  applications: Application[];
  /** IN-006 — false until the company invites them to interview; there is no thread before that. */
  canChat: boolean;
  /**
   * The engagement already on file. The demo holds one at a time, so while it exists no other role
   * can be applied to — applying used to overwrite it, contract and payment history included.
   */
  engagement: { roleSlug: string; title: string; company: string; withdrawable: boolean } | null;
  /**
   * `notify` overrides which notification fires: omitted infers it from the stage, `false` stays
   * silent, and a kind names it outright.
   */
  setStage: (id: string, stage: Stage, status?: Application["status"], notify?: MoveKind | false) => void;
  /** IN-075 — the reason, if one is given, goes to the Team Builder with the answer. */
  declineOffer: (id: string, reason?: string) => void;
  /** Refused (false) once an offer has been accepted: a signed contract is ended, not withdrawn. */
  withdraw: (id: string) => boolean;
  canWithdraw: (app: Application) => boolean;
  /** IN-017 — false when it can't go: applied or withdrawn already, or engaged on another role. */
  apply: (roleSlug: string, title: string, company: string, match: number, extras?: { note?: string; quiz?: boolean }) => boolean;
  /** IN-072 / IN-073 — only while a proposal is actually requested; false otherwise. */
  submitProposal: (id: string, proposal: Omit<DealProposal, "version" | "sent">) => boolean;
  withdrawnRoleSlugs: string[];
  /** Roles whose Team Builder declined this talent's proposal. A new application replaces that record, so this is what keeps the role from being applied to again. */
  declinedRoleSlugs: string[];
  /** IN-076 — the contracts, derived from the shared engagement. */
  contracts: Contract[];
  /** IN-026 / IN-041 / IN-077 — a progress update (a value, or a % when there is no target) or Mark as done. */
  submitObjective: (slug: string, objectiveId: string, submission: { value?: number; percent?: number; note?: string; done?: boolean }) => void;
  /** IN-028 / IN-030 — ticking an Automatic objective's key result; the last one sends it for approval. */
  completeKeyResult: (slug: string, objectiveId: string, keyResultId: string) => void;
  /** IN-026 — the objective's discussion, which the Team Builder reads on their side. */
  commentOnObjective: (slug: string, objectiveId: string, text: string) => void;
  /** IN-046 — the full-time offer that follows the trial. */
  acceptFullTime: () => void;
  declineFullTime: (reason?: string) => void;
  /* Disputes live in @/lib/demo/disputes, where the Team Builder and Admin see the same record. */
  /** IN-051 / IN-052 / IN-053 — the seeded ledger plus anything recorded this session, newest first. */
  transactions: Transaction[];
  /** IN-070 — interviews the Team Builder has booked on the shared engagement. */
  interviews: Interview[];
  /** IN-071 — declining keeps the application open and tells the Team Builder. */
  declineInterview: (id: string) => void;
  /**
   * IN-060 / IN-061 / IN-062 — the profile as Team Builders see it. The edit form used to keep it
   * in page state, so every "Profile saved" was a lie that a reload undid.
   */
  profile: Profile;
  setProfile: (patch: Partial<Profile>) => void;
  /** IN-063 / IN-064 — the quiz answers, and the tags and match percentages derived from them. */
  workStyle: number[];
  setWorkStyle: (answers: number[]) => void;
  tags: string[];
  payouts: PayoutMethod[];
  addPayout: (m: PayoutMethod) => void;
  removePayout: (id: string) => void;
  setDefaultPayout: (id: string) => void;
  notifications: Notification[];
  markRead: (id?: string) => void;
  /** What has been released and not yet withdrawn — added up from the ledger, never stored. */
  available: number;
  withdrawFunds: () => void;
};

/** Everything on the profile screen that the independent can change. */
export type Profile = {
  name: string;
  headline: string;
  bio: string;
  rate: string;
  level: string;
  location: string;
  photo: string;
  skills: string[];
  links: { linkedin: string; portfolio: string; website: string };
  /** IN-067 — account details, edited from Settings and saved with everything else. */
  email: string;
  phone: string;
  timezone: string;
};

const SEED_PROFILE: Profile = {
  name: ME.name,
  headline: ME.headline,
  bio: seedProfile.bio,
  rate: seedProfile.rate,
  level: seedProfile.level,
  location: seedProfile.location,
  photo: seedProfile.photo,
  skills: seedProfile.skills,
  links: seedProfile.links,
  email: "juandelacruz@gmail.com",
  phone: "+63 917 555 0142",
  timezone: "(GMT+8) Manila",
};

/** The deal as an application card: the talent's side of the one engagement. */
const applicationFromDeal = (deal: Deal): Application => ({
  id: DEAL_ID,
  roleSlug: deal.roleSlug,
  title: deal.title,
  company: deal.company,
  match: deal.match,
  submitted: `${deal.invited ? "Invited" : "Submitted"} ${deal.submitted}`,
  stage: stageOf(deal),
  status: dealStatus(deal),
});

/** The talent's status line for the deal, most advanced fact first. */
function dealStatus(deal: Deal): Application["status"] {
  if (deal.stage === "hired") {
    if (isFullTime(deal)) return { label: "Hired · full-time", tone: "ok" };
    if (deal.fullTime?.status === "sent") return { label: "Full-time offer received", tone: "ok" };
    return deal.contract?.ended ? { label: "Trial ended", tone: "neutral" } : { label: "Hired · trial running", tone: "ok" };
  }
  if (deal.proposalDeclined) return { label: "Proposal declined", tone: "danger", meta: deal.proposalDeclined.date };
  if (deal.offer?.status === "declined") return { label: "Offer declined", tone: "danger" };
  if (deal.offer?.status === "withdrawn") return { label: "Offer withdrawn", tone: "neutral" };
  if (deal.offer?.status === "sent") return deal.offer.updated ? { label: "Offer updated", tone: "warn", meta: deal.offer.updated } : { label: "Offer received", tone: "ok" };
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

/**
 * The deal's contract as the talent's tracker reads it: a trial, or the full-time engagement it
 * became. Dates are shown the way every other date reads, the countdown is in working days, and
 * the fit score, heatmap and evaluation come off the record rather than sitting at zero.
 */
const contractFromDeal = (deal: Deal): Contract | null => {
  const c = deal.contract;
  if (!c) return null;
  const fullTime = isFullTime(deal) && !!deal.fullTime;
  const trial = trialStateOf(c);
  const evaluations = evaluationsOf(c);
  const done = c.objectives.filter((o) => o.status === "complete").length;
  const score = fitScoreOf(deal);
  const { activity, streak } = activityOf(c);
  const started = dayLabel(fullTime ? deal.fullTime!.start : c.started);
  const rate = fullTime ? `${deal.fullTime!.salary} /month` : c.rate;
  return {
    slug: deal.roleSlug,
    title: deal.title,
    company: deal.company,
    initials: deal.company.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase(),
    type: fullTime ? "full-time" : "trial",
    location: "Remote",
    line: fullTime ? `Full-time ${sinceOrFrom(started)} ${started} · ${rate}` : `Started ${started} · ${trial.day} · ${rate}`,
    status: c.ended ? { label: "Ended", tone: "neutral" } : fullTime ? { label: "Active", tone: "ok" } : evaluations.length ? { label: "Evaluation received", tone: "ok" } : trial.over ? { label: "Awaiting evaluation", tone: "neutral" } : { label: "On track", tone: "ok" },
    progressLabel: fullTime ? "Objectives complete" : "Trial progress",
    progress: c.objectives.length ? Math.round((done / c.objectives.length) * 100) : 0,
    progressTone: "primary",
    manager: PAIR_MANAGER,
    managerFirst: PAIR_MANAGER.split(" ")[0],
    started,
    day: fullTime ? reviewQuarter(deal.fullTime!.start) : trial.day,
    ends: fullTime ? "Ongoing" : dayLabel(c.ends),
    left: fullTime ? null : trial.left,
    over: !fullTime && trial.over,
    endedOn: c.ended ? c.endedOn : undefined,
    workingDays: fullTime ? undefined : trial.total,
    rate,
    objectives: c.objectives.map((o) => ({ ...o, due: fullTime ? undefined : dayLabel(c.ends) })),
    tfs: { overall: score.overall, performance: score.performance, profile: score.profile, workStyle: score.workStyle, evaluation: score.evaluation },
    phase: fullTime ? 4 : score.phase,
    activity,
    streak,
    evaluations,
    deposit: c.deposit,
  };
};

/** The one id both portals use for the shared engagement. */
export const DEAL_ID = "deal";
const PAIR_MANAGER = "Alex Rivera";

const Ctx = createContext<Demo | null>(null);

/** Stages the sheet says the Team Builder hears about, and which movement that is. */
const STAGE_MOVE = {
  invite_accepted: "interview_accepted",
  proposal_sent: "proposal_sent",
  hired: "offer_accepted",
} as const;

/** A signed offer can't be withdrawn — the contract behind it is ended, or disputed, instead. */
const withdrawable = (stage: Stage) => stage !== "offer_accepted" && stage !== "hired";

export function DemoProvider({ children }: { children: ReactNode }) {
  const [saved, setSaved] = usePersisted("ind.saved", INITIAL_SAVED);
  const [applications, setApplications] = usePersisted("ind.applications", seedApps);
  const [withdrawnRoleSlugs, setWithdrawnRoleSlugs] = usePersisted<string[]>("ind.withdrawn", []);
  const [declinedRoleSlugs, setDeclinedRoleSlugs] = usePersisted<string[]>("ind.declined", []);
  const [contracts] = usePersisted("ind.contracts", seedContracts);
  const [profile, setProfile] = usePersisted<Profile>("ind.profile", SEED_PROFILE);
  const [workStyle, setWorkStyle] = usePersisted("ind.workStyle", WORK_STYLE_ANSWERS);
  const [payouts, setPayouts] = usePersisted("ind.payouts", seedPayouts);
  /** Withdrawals made in this session; they join the ledger like any other transaction. */
  const [withdrawals, setWithdrawals] = usePersisted<Transaction[]>("ind.withdrawals", []);
  const live = useLive();
  const deal = useDeal();

  /**
   * IN-051 — a payment recorded on the other side of the demo has to show up here immediately,
   * so the ledger is the seed plus whatever the shared store has collected since, newest first.
   */
  const amountOf = (s: string) => Number(s.replace(/[^0-9.]/g, "")) || 0;
  const recorded: Transaction[] = [
    ...live.payments.map((p) =>
      // A dispute ruled for the Team Builder sends escrow back to them: on the contract's history
      // (IN-032), never in this balance.
      p.kind === "refunded"
        ? { date: p.date, at: p.at, desc: `Refunded to ${p.company} after a dispute ruling · ${p.title}`, party: p.company, type: "Payment Refunded" as const, contract: p.contract, contractTitle: p.title, amount: p.amount, status: { label: "Refunded", tone: "neutral" as const } }
        : { date: p.date, at: p.at, desc: `Payment released · ${p.title}`, party: p.company, type: "Payment Released" as const, contract: p.contract, contractTitle: p.title, amount: `+${p.amount}`, status: { label: "Available", tone: "ok" as const } },
    ),
    ...withdrawals,
    ...seedTransactions,
  ];

  /**
   * Released payments minus what has already been paid out. It used to be a stored number that
   * no transaction moved, so the balance and the ledger could disagree.
   */
  const released = recorded.filter((t) => t.type === "Payment Released").reduce((n, t) => n + amountOf(t.amount), 0);
  const paidOut = recorded.filter((t) => t.type === "Payout").reduce((n, t) => n + amountOf(t.amount), 0);
  const available = Math.max(0, released - paidOut);

  /**
   * A released payment reads "Available" until a payout covers it, oldest first — it used to stay
   * Available after the money had been withdrawn.
   */
  let covered = paidOut;
  const settledAt = new Map<Transaction, boolean>();
  for (const t of [...recorded].filter((x) => x.type === "Payment Released").sort((a, b) => a.at - b.at)) {
    const amount = amountOf(t.amount);
    settledAt.set(t, covered >= amount - 0.001);
    covered = Math.max(0, covered - amount);
  }
  const transactions = recorded.map((t) => (settledAt.get(t) ? { ...t, status: { label: "Paid out", tone: "neutral" as const } } : t));

  const dealInterview: Interview | null = deal?.interview
    ? {
        id: DEAL_ID,
        role: deal.title,
        roleHref: `/independent/jobs/applications/${DEAL_ID}`,
        company: deal.company,
        when: deal.interview.when,
        format: deal.interview.format,
        link: deal.interview.link,
        status: deal.interview.outcome === "done" ? "completed" : deal.interview.outcome ?? (deal.interview.accepted ? "accepted" : "starts"),
        past: deal.interview.past,
      }
    : null;
  const dealApplication = deal ? applicationFromDeal(deal) : null;
  const canChat = canMessage(deal);
  const dealContract = deal ? contractFromDeal(deal) : null;
  const allApplications: Application[] = dealApplication ? [dealApplication, ...applications] : applications;
  const allContracts: Contract[] = dealContract ? [dealContract, ...contracts] : contracts;

  /** Rewrites one objective of the live contract; anything else is left alone. */
  const patchObjective = (slug: string, objectiveId: string, fn: (o: ContractObjective) => ContractObjective, logged = true) =>
    updateDeal((d) => {
      if (!d.contract || d.roleSlug !== slug) return d;
      return {
        ...d,
        contract: {
          ...d.contract,
          logs: logged ? withLog(d.contract.logs, objectiveId) : d.contract.logs,
          objectives: d.contract.objectives.map((o) => (o.id === objectiveId ? fn(o) : o)),
        },
      };
    });

  /**
   * A talent whose proposal was declined is free to apply elsewhere. They used to stay locked to
   * that engagement until they "withdrew" an application the Team Builder had already turned down,
   * which also sent that Team Builder a withdrawal notice. A plain drop is silent (the talent is not
   * told), so it keeps the lock rather than giving itself away.
   */
  const releasedDeal = !!deal?.dropped && !!deal.proposalDeclined && !deal.contract;

  const value: Demo = {
    saved,
    toggleSaved: (slug) => setSaved((s) => (s.includes(slug) ? s.filter((x) => x !== slug) : [...s, slug])),
    applications: allApplications,
    canChat,
    engagement: deal && !releasedDeal ? { roleSlug: deal.roleSlug, title: deal.title, company: deal.company, withdrawable: withdrawable(deal.stage) } : null,
    setStage: (id, stage, status, notify) => {
      const app = allApplications.find((x) => x.id === id);
      if (id === DEAL_ID) {
        const d = getDeal();
        // IN-074 — only an open offer can be signed; a declined or withdrawn one stays that way.
        if (!d || (stage === "hired" && d.offer?.status !== "sent")) return;
        const kind = notify === undefined ? STAGE_MOVE[stage as keyof typeof STAGE_MOVE] : notify || undefined;
        if (kind && app) move(kind, { slug: app.roleSlug, title: app.title });
        // The shared engagement moves in the shared store, so the Team Builder's tracker moves with it.
        updateDeal((x) => {
          // IN-070 — confirming is what the Team Builder's schedule reads as Confirmed.
          if (stage === "invite_accepted" && x.interview) return { ...x, stage, interview: { ...x.interview, accepted: true } };
          if (stage !== "hired" || !x.offer) return { ...x, stage };
          // Accepting turns the offer's objectives into the trial both trackers now work from, and
          // the escrow funded with the offer is what the contract holds.
          return {
            ...x,
            stage,
            offer: { ...x.offer, status: "accepted" },
            contract: x.contract ?? {
              started: x.offer.start,
              ends: x.offer.end,
              rate: x.offer.rate,
              deposit: x.offer.deposit?.escrow,
              objectives: x.offer.objectives.map(objectiveFrom),
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
      setApplications((a) => a.map((x) => (x.id === id ? { ...x, stage, status: status ?? x.status } : x)));
    },
    declineOffer: (id, reason) => {
      if (id !== DEAL_ID) return;
      const d = getDeal();
      if (!d?.offer || d.offer.status !== "sent") return;
      move("offer_declined", { slug: d.roleSlug, title: d.title });
      updateDeal((x) => (x.offer ? { ...x, offer: { ...x.offer, status: "declined", declineReason: reason?.trim() || undefined } } : x));
    },
    canWithdraw: (app) => withdrawable(app.stage),
    withdraw: (id) => {
      if (id === DEAL_ID) {
        const d = getDeal();
        if (!d || !withdrawable(d.stage)) return false;
        move("withdrawn", { slug: d.roleSlug, title: d.title });
        setWithdrawnRoleSlugs((slugs) => (slugs.includes(d.roleSlug) ? slugs : [...slugs, d.roleSlug]));
        clearDeal();
        return true;
      }
      const app = allApplications.find((x) => x.id === id);
      if (!app || !withdrawable(app.stage)) return false;
      move("withdrawn", { slug: app.roleSlug, title: app.title });
      setWithdrawnRoleSlugs((slugs) => (slugs.includes(app.roleSlug) ? slugs : [...slugs, app.roleSlug]));
      setApplications((a) => a.filter((x) => x.id !== id));
      return true;
    },
    apply: (roleSlug, title, company, match, extras) => {
      if (withdrawnRoleSlugs.includes(roleSlug) || declinedRoleSlugs.includes(roleSlug) || allApplications.some((x) => x.roleSlug === roleSlug)) return false; // IN-017: cannot apply twice
      // IN-017 — applying starts the engagement the Team Builder sees in their candidate tracker. A
      // declined one no longer holds the talent, so the new application takes its place.
      if (releasedDeal && deal) {
        const declinedRole = deal.roleSlug;
        setDeclinedRoleSlugs((slugs) => (slugs.includes(declinedRole) ? slugs : [...slugs, declinedRole]));
        clearDeal();
      }
      const started = startDeal({ roleSlug, title, company, match, submitted: today(), note: extras?.note?.trim() || undefined, quiz: extras?.quiz });
      if (started) move("applied", { slug: roleSlug, title });
      return started;
    },
    submitProposal: (id, proposal) => {
      if (id !== DEAL_ID) return false;
      const d = getDeal();
      // Only an open request can be answered — the wizard used to reach the deal at any stage and
      // move a signed, even ended, contract back to "Proposal submitted".
      if (!d || d.stage !== "proposal_requested") return false;
      move("proposal_sent", { slug: d.roleSlug, title: d.title });
      updateDeal((x) => ({
        ...x,
        stage: "proposal_sent",
        proposal: { ...proposal, version: (x.proposal?.version ?? 0) + 1, sent: today() },
        revision: undefined,
      }));
      return true;
    },
    withdrawnRoleSlugs,
    declinedRoleSlugs,
    contracts: allContracts,
    submitObjective: (slug, objectiveId, { value: amount, percent, note, done }) => {
      const d = getDeal();
      if (!d?.contract || d.roleSlug !== slug) return;
      const at = momentLabel();
      const text = note?.trim();
      patchObjective(slug, objectiveId, (o) => {
        const pct = done ? 100 : o.target ? Math.min(100, Math.round(((amount ?? 0) / o.target) * 100)) : Math.min(100, Math.max(0, Math.round(percent ?? o.progress)));
        const summary = done ? "Marked as done" : o.target ? `Logged ${amount}${o.unit ? ` ${o.unit}` : ""} of ${o.target} — ${pct}%` : `Reported ${pct}% progress`;
        return {
          ...o,
          status: "pending",
          progress: pct,
          current: o.target && !done ? amount : o.current,
          meta: done ? "Marked as done · awaiting approval" : `${summary} · sent for review`,
          updated: today(),
          trend: done ? o.trend : [...(o.trend ?? []), pct],
          lastUpdate: { date: at, text: text || summary, value: o.target && !done ? amount : undefined, done },
          activity: [{ at, text: `${summary}${text ? ` — “${text}”` : ""}, sent for review` }, ...(o.activity ?? [])],
        };
      });
      move(done ? "objective_done" : "objective_update", { slug: d.roleSlug, title: d.title });
    },
    completeKeyResult: (slug, objectiveId, keyResultId) => {
      const d = getDeal();
      const objective = d?.contract?.objectives.find((o) => o.id === objectiveId);
      const kr = objective?.keyResults?.find((k) => k.id === keyResultId);
      if (!d || d.roleSlug !== slug || !objective?.keyResults || !kr || kr.done) return;
      const krs = objective.keyResults.map((k) => (k.id === keyResultId ? { ...k, done: true } : k));
      const pct = keyResultPercent(krs);
      const all = pct === 100;
      const at = momentLabel();
      patchObjective(slug, objectiveId, (o) => ({
        ...o,
        keyResults: krs,
        progress: pct,
        status: all ? "pending" : o.status,
        meta: all ? "All key results done · awaiting approval" : `${krs.filter((k) => k.done).length} of ${krs.length} key results done`,
        updated: today(),
        trend: [...(o.trend ?? []), pct],
        lastUpdate: all ? { date: at, text: "All key results done — sent for approval", done: true } : o.lastUpdate,
        activity: [{ at, text: `Key result “${kr.title}” marked done — ${pct}%${all ? ", sent for approval" : ""}` }, ...(o.activity ?? [])],
      }));
      // The last key result is what puts the objective in front of the Team Builder.
      if (all) move("objective_done", { slug: d.roleSlug, title: d.title });
    },
    commentOnObjective: (slug, objectiveId, text) => {
      const body = text.trim();
      if (!body) return;
      patchObjective(slug, objectiveId, (o) => ({ ...o, comments: [...(o.comments ?? []), { side: "independent", name: profile.name, at: momentLabel(), text: body }] }), false);
    },
    acceptFullTime: () => {
      const d = getDeal();
      if (!d?.contract || d.fullTime?.status !== "sent") return;
      // "Escrow closes and salary is charged monthly once they accept": what the trial still holds
      // is released to the talent now, except anything an open dispute is keeping.
      const escrow = escrowOf(d, getDisputes());
      const release = escrow ? Math.max(0, escrow.held - escrow.onHold) : 0;
      updateDeal((x) =>
        x.contract && x.fullTime
          ? {
              ...x,
              fullTime: { ...x.fullTime, status: "accepted", accepted: today() },
              contract: { ...x.contract, ended: false, endedOn: undefined, escrow: { released: (x.contract.escrow?.released ?? 0) + release, refunded: x.contract.escrow?.refunded ?? 0 } },
            }
          : x,
      );
      if (release > 0) recordPayment({ contract: d.roleSlug, title: d.title, company: d.company, amount: usd(release), period: "Trial complete — converted to full-time" });
      move("fulltime_accepted", { slug: d.roleSlug, title: d.title });
    },
    declineFullTime: (reason) => {
      const d = getDeal();
      if (d?.fullTime?.status !== "sent") return;
      updateDeal((x) => (x.fullTime ? { ...x, fullTime: { ...x.fullTime, status: "declined", declineReason: reason?.trim() || undefined } } : x));
      move("fulltime_declined", { slug: d.roleSlug, title: d.title });
    },
    transactions,
    interviews: dealInterview ? [dealInterview, ...seedInterviews] : seedInterviews,
    declineInterview: (id) => {
      if (id !== DEAL_ID || !deal) return;
      move("interview_declined", { slug: deal.roleSlug, title: deal.title });
      updateDeal((d) => (d.interview ? { ...d, interview: { ...d.interview, past: true, accepted: false, outcome: "declined" } } : d));
    },
    profile,
    setProfile: (patch) => setProfile((p) => ({ ...p, ...patch })),
    workStyle,
    setWorkStyle,
    tags: tagsFor(workStyle),
    payouts,
    addPayout: (m) =>
      setPayouts((p) => {
        const canBeDefault = m.isDefault && m.verified.startsWith("Verified");
        const next = { ...m, isDefault: canBeDefault };
        return (canBeDefault ? p.map((x) => ({ ...x, isDefault: false })) : p).concat(next);
      }),
    removePayout: (id) => setPayouts((p) => p.filter((x) => x.id !== id)),
    setDefaultPayout: (id) => setPayouts((p) => p.map((x) => ({ ...x, isDefault: x.id === id && x.verified.startsWith("Verified") }))),
    notifications: live.independent,
    markRead: (id) => markLiveRead("independent", id),
    available,
    withdrawFunds: () => {
      const method = payouts.find((p) => p.isDefault && p.verified.startsWith("Verified"));
      if (available <= 0 || !method) return;
      setWithdrawals((all) => [
        {
          date: today(),
          at: dayStamp(),
          desc: `Payout to ${method.brand} ····${method.last4}`,
          party: "—",
          type: "Payout" as const,
          amount: `−${usd(available)}`,
          status: { label: "Paid", tone: "ok" as const },
        },
        ...all,
      ]);
    },
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useDemo(): Demo {
  const v = useContext(Ctx);
  if (!v) throw new Error("useDemo must be used inside <DemoProvider>");
  return v;
}
