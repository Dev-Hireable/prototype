"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { Stage } from "@/components/independent/ui";
import { dayLabel, dayStamp, momentLabel, reviewQuarter, sinceOrFrom, today } from "@/lib/demo/dates";
import { statusOf, trialClosed } from "@/lib/contract/lifecycle";
import { activityOf, canMessage, clearDeal, consumeInvite, contractTypeOf, converted, evaluationsOf, fillPosting, fitScoreOf, getDeal, lifecycleOfDeal, proposalSource, stageOf, startDeal, startedAsTrial, trialStateOf, updateDeal, useDeal, useInvites, withProposalEvent } from "@/lib/demo/deal";
import type { Deal, DealProposal } from "@/lib/demo/deal";
import { escrowOf, getDisputes, usd } from "@/lib/demo/disputes";
import { hoursLabel, JOB_TYPE_LABEL } from "@/lib/demo/job-types";
import { markRead as markLiveRead, move, recordPayment, sendChat, sendFile, useLive, usePersisted } from "@/lib/demo/live";
import type { MoveKind } from "@/lib/demo/live";
import { donePercent, taskFromOffer } from "@/lib/demo/tasks";
import { INITIAL_SAVED, applications as seedApps, contracts as seedContracts, interviews as seedInterviews, ME, payoutMethods as seedPayouts, profile as seedProfile, transactions as seedTransactions } from "./data";
import { traitTagsFor, type WorkStyleTag } from "@/lib/demo/work-style";
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
  /** TB-106 — a note on the proposal's history; it goes to the thread too, so the Team Builder reads it either way. */
  commentOnProposal: (text: string, file?: File) => void;
  withdrawnRoleSlugs: string[];
  /** Roles whose Team Builder declined this talent's proposal. A new application replaces that record, so this is what keeps the role from being applied to again. */
  declinedRoleSlugs: string[];
  /** IN-076 — the contracts, derived from the shared engagement. */
  contracts: Contract[];
  /* The live contract's work items change through the work repository (@/lib/work), shared with the Team Builder's portal. */
  /** IN-084 — the full-time or part-time offer that follows the trial. */
  acceptConversion: () => void;
  declineConversion: (reason?: string) => void;
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
  tags: WorkStyleTag[];
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
 * The deal's contract as the talent's tracker reads it: a trial, the full-time or part-time role it
 * became, or one they were hired straight onto. Dates are shown the way every other date reads, the
 * countdown is in working days, and the fit score, heatmap and evaluation come off the record rather
 * than sitting at zero.
 */
const contractFromDeal = (deal: Deal): Contract | null => {
  const c = deal.contract;
  if (!c) return null;
  const type = contractTypeOf(deal);
  const ongoing = type !== "trial";
  const fromTrial = startedAsTrial(deal);
  const trial = trialStateOf(c);
  const evaluations = evaluationsOf(c);
  const score = fitScoreOf(deal);
  const { activity, streak } = activityOf(c);
  const conversion = converted(deal) ? deal.conversion : undefined;
  const started = dayLabel(conversion?.start ?? c.started);
  const rate = conversion ? `${conversion.salary} /month` : c.rate;
  const hours = conversion?.hours ?? c.hours;
  const l = lifecycleOfDeal(deal);
  const upcoming = l?.phase === "starts";
  return {
    slug: deal.roleSlug,
    title: deal.title,
    company: deal.company,
    initials: deal.company.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase(),
    type,
    origin: fromTrial ? "trial" : "direct",
    location: "Remote",
    line: ongoing ? `${JOB_TYPE_LABEL[type]} ${sinceOrFrom(started)} ${started} · ${rate}${hours ? ` · ${hoursLabel(hours)}` : ""}` : `Started ${started} · ${l?.trial?.day ?? trial.day} · ${rate}`,
    // One lifecycle for every tab and list (@/lib/contract/lifecycle).
    status: l ? statusOf(l, "independent") : { label: "On track", tone: "ok" },
    startsOn: upcoming && l ? dayLabel(l.since) : undefined,
    progressLabel: "Tasks done",
    progress: donePercent(c.tasks),
    progressTone: "primary",
    manager: PAIR_MANAGER,
    managerFirst: PAIR_MANAGER.split(" ")[0],
    started,
    day: ongoing ? reviewQuarter(conversion?.start ?? c.started) : (l?.trial?.day ?? trial.day),
    ends: ongoing ? (c.ended && c.endedOn ? c.endedOn : "Ongoing") : dayLabel(c.ends),
    left: ongoing ? null : trial.left,
    over: !ongoing && trial.over,
    endedOn: c.ended ? c.endedOn : undefined,
    workingDays: ongoing ? undefined : trial.total,
    rate,
    hours,
    tasks: c.tasks,
    tfs: fromTrial ? { overall: score.overall, performance: score.performance, profile: score.profile, workStyle: score.workStyle, evaluation: score.evaluation } : null,
    phase: ongoing ? 4 : score.phase,
    activity,
    streak,
    evaluations,
    deposit: c.deposit,
    match: deal.match,
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
  const [workStyle, setWorkStyle] = usePersisted<number[]>("ind.workStyle", []);
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

  /**
   * A talent whose proposal was declined is free to apply elsewhere. They used to stay locked to
   * that engagement until they "withdrew" an application the Team Builder had already turned down,
   * which also sent that Team Builder a withdrawal notice. A plain drop is silent (the talent is not
   * told), so it keeps the lock rather than giving itself away.
   */
  /** Turned down before any hire (dropped, or its proposal declined): it no longer holds the talent. */
  const releasedDeal = !!deal?.dropped && !deal.contract;
  /** Roles the company invited them to apply to — which reopens a role that turned them down. */
  const invites = useInvites();
  const reopened = (slugs: string[]) => slugs.filter((s) => !invites[s]);

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
              tasks: o.tasks.map((t, i) => taskFromOffer(t, i, o.start, { trialEnd: trial ? o.end : undefined, created: today(), name: PAIR_MANAGER })),
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
      // IN-017: cannot apply twice — unless the company invited them to apply again (TB-017).
      const invited = !!invites[roleSlug];
      if (!invited && (withdrawnRoleSlugs.includes(roleSlug) || declinedRoleSlugs.includes(roleSlug))) return false;
      if (allApplications.some((x) => x.roleSlug === roleSlug && !(x.id === DEAL_ID && releasedDeal))) return false;
      // IN-017 — applying starts the engagement the Team Builder sees in their candidate tracker. A
      // declined one no longer holds the talent, so the new application takes its place.
      if (releasedDeal && deal) {
        const declinedRole = deal.roleSlug;
        if (declinedRole !== roleSlug) setDeclinedRoleSlugs((slugs) => (slugs.includes(declinedRole) ? slugs : [...slugs, declinedRole]));
        clearDeal();
      }
      const started = startDeal({ roleSlug, title, company, match, submitted: today(), note: extras?.note?.trim() || undefined, quiz: extras?.quiz });
      if (started) {
        move("applied", { slug: roleSlug, title });
        if (invited) {
          consumeInvite(roleSlug);
          setDeclinedRoleSlugs((slugs) => slugs.filter((s) => s !== roleSlug));
          setWithdrawnRoleSlugs((slugs) => slugs.filter((s) => s !== roleSlug));
        }
      }
      return started;
    },
    submitProposal: (id, proposal) => {
      if (id !== DEAL_ID) return false;
      const d = getDeal();
      // Only an open request can be answered — the wizard used to reach the deal at any stage and
      // move a signed, even ended, contract back to "Proposal submitted".
      if (!d || d.stage !== "proposal_requested" || d.dropped) return false;
      move("proposal_sent", { slug: d.roleSlug, title: d.title });
      updateDeal((x) => {
        const sent: DealProposal = { ...proposal, version: (x.proposal?.version ?? 0) + 1, sent: today() };
        // TB-106 — each version stays on the history, so the Team Builder can read it against the last.
        return { ...withProposalEvent(x, { kind: "proposal", at: momentLabel(), proposal: sent }), stage: "proposal_sent", proposal: sent, revision: undefined };
      });
      return true;
    },
    commentOnProposal: (text, file) => {
      const body = file ? `Sent an attachment: ${file.name}` : text.trim();
      const source = proposalSource(getDeal());
      if (!body || !source) return;
      // It goes to the thread too, marked as written on the proposal so the inbox links back to it.
      // The chat message's id, so the note shows the same sent / seen receipt as the thread.
      const chatId = file ? sendFile("independent", file, source) : sendChat("independent", body, source);
      updateDeal((x) => withProposalEvent(x, { kind: "comment", at: momentLabel(), by: "independent", text: body, chatId }));
    },
    withdrawnRoleSlugs: reopened(withdrawnRoleSlugs),
    declinedRoleSlugs: reopened(declinedRoleSlugs),
    contracts: allContracts,
    acceptConversion: () => {
      const d = getDeal();
      const offer = d?.conversion;
      if (!d?.contract || offer?.status !== "sent" || d.contract.ended) return;
      // The escrow is normally paid out with the trial's evaluation; anything it still holds
      // (less what an open dispute is keeping) is released now.
      const escrow = escrowOf(d, getDisputes());
      const release = escrow ? Math.max(0, escrow.held - escrow.onHold) : 0;
      updateDeal((x) =>
        x.contract && x.conversion
          ? {
              ...x,
              conversion: { ...x.conversion, status: "accepted", accepted: today() },
              contract: { ...x.contract, escrow: { released: (x.contract.escrow?.released ?? 0) + release, refunded: x.contract.escrow?.refunded ?? 0 } },
            }
          : x,
      );
      if (release > 0) recordPayment({ contract: d.roleSlug, title: d.title, company: d.company, amount: usd(release), period: `Trial complete — hired ${JOB_TYPE_LABEL[offer.type].toLowerCase()}`, chapter: "trial" });
      move("hire_accepted", { slug: d.roleSlug, title: d.title }, { type: offer.type });
    },
    declineConversion: (reason) => {
      const d = getDeal();
      const offer = d?.conversion;
      if (!d || offer?.status !== "sent") return;
      updateDeal((x) => (x.conversion ? { ...x, conversion: { ...x.conversion, status: "declined", declineReason: reason?.trim() || undefined } } : x));
      move("hire_declined", { slug: d.roleSlug, title: d.title }, { type: offer.type, note: reason?.trim() || undefined });
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
    tags: traitTagsFor(workStyle, "independent"),
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
