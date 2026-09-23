"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { Stage } from "@/components/independent/ui";
import { DEAL_ID, dealObjectivesFrom, postingFrom } from "@/lib/team/deal-view";
import { dayLabel, momentLabel, parseDay, reviewQuarter, today } from "@/lib/demo/dates";
import { activityOf, canMessage, closePosting, evaluationsOf, fitScoreOf, getDeal, isFullTime, objectiveFrom, publishPosting, stageOf, startDeal, trialStateOf, updateDeal, useDeal, usePostings } from "@/lib/demo/deal";
import type { ContractObjective, Deal, DealObjective, OfferStatus } from "@/lib/demo/deal";
import { dealContract as contractRefOf, escrowOf, getDisputes, rateAmount, usd } from "@/lib/demo/disputes";
import { markRead as markLiveRead, move, PAIR, recordPayment, useLive, usePersisted } from "@/lib/demo/live";
import type { MoveKind } from "@/lib/demo/live";
import { byName, COMPANY_FIELDS, COMPANY_PROFILE, INITIAL_SAVED, INTERVIEW_CANCELLED, INTERVIEW_DECLINED, TEAM_PROFILE, candidates as seedCandidates, contracts as seedContracts, interviews as seedInterviews, offers as seedOffers, paymentMethods as seedCards, roles as seedRoles, transactions as seedTransactions } from "./data";
import type { Candidate, CompanyProfile, Contract, Evaluation, Interview, Notification, Objective, Offer, PaymentMethod, Role, RoleStatus, TeamProfile, Transaction } from "./data";

/**
 * Demo state for the Team Builder pages (save an independent → Saved list; invite → candidate
 * stage; publish a role → All roles; add a card → Settings). Persisted to localStorage so a
 * refresh keeps the run; notifications and chat live in @/lib/demo/live because the Independent
 * portal sees them too.
 * ponytail: plain state in a context; swap for a real API client when one exists.
 */
type Demo = {
  saved: string[];
  toggleSaved: (slug: string) => void;
  roles: Role[];
  addRole: (r: Role) => void;
  /** TB-032 — copy any role into a fresh Draft and return the new slug. */
  duplicateRole: (slug: string) => string | undefined;
  setRoleStatus: (slug: string, status: RoleStatus) => void;
  removeRole: (slug: string) => void;
  /**
   * TB-001 — the checklist locks "Create your first role" until the company profile is complete
   * and a card can fund the escrow; publishing honours the same lock (drafts are always fine).
   */
  canPublish: boolean;
  candidates: Candidate[];
  /** The thread only exists from the interview onwards — the same point the talent sees it open. */
  canChat: boolean;
  /**
   * `notify` overrides which notification fires: omitted infers it from the stage, `false`
   * stays silent, and a kind names it outright.
   */
  setStage: (id: string, stage: Stage, status?: Candidate["status"], notify?: MoveKind | false) => void;
  /** TB-103 — the request, with the note the talent reads beside it. */
  requestProposal: (id: string, note?: string) => void;
  /** TB-106 — sends the proposal back with the note the talent revises against. */
  requestRevision: (id: string, note: string) => void;
  /** TB-107 — the talent is told, with the reason; the card moves to Dropped. */
  declineProposal: (id: string, reason?: string) => void;
  setDropped: (id: string, dropped: boolean) => void;
  invite: (independent: string, role: string) => void;
  /**
   * TB-017 — an invite to apply only makes sense for someone who is not in the tracker yet.
   * Once they are a candidate or a match, the next move is an interview, not another invite.
   */
  inPipeline: (independent: string) => boolean;
  /** Their card, when they're in the tracker — what "View in pipeline" opens. */
  pipelineOf: (independent: string) => Candidate | undefined;
  /**
   * TB-040 — scheduling an interview from a candidate's profile has to produce a row on the
   * Interviews page and the dashboard widget, and a reschedule or cancel has to stick.
   */
  interviews: Interview[];
  /**
   * TB-037 — book an interview for a tracker card. For the live pair it goes on the shared
   * engagement, so it lands in their pipeline (IN-018 Interview Requested); someone who never
   * applied — invited from Discover, or matched — has no engagement yet, and this starts one.
   * Booking again after a decline or a cancellation replaces the old slot.
   */
  inviteToInterview: (candidateId: string, slot: { when: string; format: string; link?: string; note?: string }) => void;
  /** A new time for a booked interview: the talent is told and confirms again. */
  rescheduleInterview: (id: string, when: string) => void;
  /** The talent is told; they stay in the tracker and can be offered another slot. */
  cancelInterview: (id: string) => void;
  /**
   * IN-018 — the Team Builder marks a confirmed interview as held: the candidate moves to
   * Interview completed and the interview to Past. TB-103 Request Proposal waits for this, so a
   * proposal is never asked for before the two sides have actually met.
   */
  completeInterview: (id: string) => void;
  contracts: Contract[];
  /**
   * TB-071 — close the engagement and release what is still in escrow. Refused (false) while a
   * dispute is holding the money: filing one is what keeps the funds held while support reviews it.
   */
  endContract: (slug: string) => boolean;
  /** TB-084 — the ledger: the seed plus the live contract's deposit, releases and refunds. */
  transactions: Transaction[];
  /** TB-109 / TB-110 / TB-111 — the verdict on a submitted objective, told to the talent. */
  reviewObjective: (slug: string, objectiveId: string, verdict: "approve" | "revise" | "reject", reason?: string) => void;
  /** TB-075 — a full-time contract gains objectives as the work goes on. */
  createObjective: (slug: string, objective: { title: string; description?: string; kind: Objective["kind"]; target?: number; unit?: string; keyResults?: string[] }) => void;
  /** TB-112 — the objective's discussion, which the talent reads on their side. */
  commentOnObjective: (slug: string, objectiveId: string, text: string) => void;
  /**
   * TB-067 — record the evaluation so End Contract and Hire for Full-Time unlock. A list, not a
   * single entry: TB-117 lets a full-time contract be evaluated repeatedly, and TB-081 wants the
   * whole history. Newest first.
   */
  evaluations: Record<string, Evaluation[]>;
  addEvaluation: (slug: string, e: Omit<Evaluation, "date">) => void;
  offers: Offer[];
  addOffer: (o: Offer) => void;
  /** TB-105 — the offer the talent actually opens: terms, the objectives it commits them to, and the escrow funded. */
  sendOffer: (offer: { rate: string; start: string; end: string; objectives: DealObjective[]; deposit: { escrow: number; fee: number } }) => void;
  /** TB-105 — new terms on a sent or declined offer; the talent is told and signs the new version. */
  updateOffer: (terms: { rate: string; start: string; end: string; deposit: { escrow: number; fee: number } }) => void;
  /** The talent is told; the proposal is back in review, and a new offer can be sent. */
  withdrawOffer: (id: string) => void;
  /** TB-072 — the full-time offer after an evaluated trial, on the same engagement. */
  sendFullTimeOffer: (offer: { salary: string; start: string; benefits: string[] }) => void;
  setOffer: (id: string, patch: Partial<Offer>) => void;
  cards: PaymentMethod[];
  addCard: (c: PaymentMethod) => void;
  removeCard: (id: string) => void;
  setDefaultCard: (id: string) => void;
  /** TB-094/097 — the profile pages write here, and the shell and dashboard read from it. */
  profile: TeamProfile;
  setProfile: (patch: Partial<TeamProfile>) => void;
  company: CompanyProfile;
  setCompany: (patch: Partial<CompanyProfile>) => void;
  /** TB-096 — the Team Builder's quiz answers; the company's work-style badges come from them. */
  workStyle: number[];
  setWorkStyle: (answers: number[]) => void;
  notifications: Notification[];
  markRead: (id?: string) => void;
};

const Ctx = createContext<Demo | null>(null);

/** The id the full-time offer goes by in Sent Offers, beside the trial offer's DEAL_ID. */
export const FULLTIME_ID = "deal-fulltime";

/** The Team Builder's status line for the deal, most advanced fact first. */
function dealStatus(deal: Deal): Candidate["status"] {
  if (deal.stage === "hired") {
    if (isFullTime(deal)) return { label: "Hired · full-time", tone: "ok" };
    if (deal.fullTime?.status === "sent") return { label: "Full-time offer sent", tone: "warn", meta: `Sent ${deal.fullTime.sent}` };
    if (deal.fullTime?.status === "declined") return { label: "Full-time offer declined", tone: "danger" };
    return deal.contract?.ended ? { label: "Trial ended", tone: "neutral" } : { label: "Hired · trial running", tone: "ok" };
  }
  if (deal.proposalDeclined) return { label: "Proposal declined", tone: "danger", meta: deal.proposalDeclined.date };
  if (deal.offer?.status === "declined") return { label: "Offer declined", tone: "danger", meta: deal.offer.declineReason };
  if (deal.offer?.status === "withdrawn") return { label: "Offer withdrawn", tone: "neutral" };
  if (deal.offer?.status === "sent") return { label: deal.offer.updated ? "Offer updated" : "Offer sent", tone: "warn", meta: `Starts ${dayLabel(deal.offer.start)}` };
  if (deal.revision) return { label: "Revision requested", tone: "warn", meta: deal.revision.date };
  if (deal.stage === "proposal_sent" && deal.proposal) return { label: "Proposal submitted", tone: "info", meta: `v${deal.proposal.version} · ${deal.proposal.sent}` };
  if (deal.stage === "proposal_requested") return { label: "Awaiting proposal", tone: "warn" };
  if (deal.stage === "interviewed") return { label: "Interview completed", tone: "ok", meta: deal.interview?.when };
  if (deal.interview?.outcome === "declined") return { label: INTERVIEW_DECLINED, tone: "danger", meta: deal.interview.when };
  if (deal.interview?.outcome === "cancelled") return { label: INTERVIEW_CANCELLED, tone: "neutral", meta: deal.interview.when };
  if (deal.interview?.accepted) return { label: "Interview confirmed", tone: "ok", meta: deal.interview.when };
  if (deal.interview) return { label: "Awaiting reply", tone: "neutral", meta: deal.interview.when };
  return { label: "New application", tone: "info" };
}

/** An interview's status pill in the Team Builder's lists, from where it has got to. */
const INTERVIEW_STATUS: Record<"awaiting" | "accepted" | "done" | "declined" | "cancelled", Interview["status"]> = {
  awaiting: { label: "Awaiting reply", tone: "neutral" },
  accepted: { label: "Confirmed", tone: "ok" },
  done: { label: "Completed", tone: "ok" },
  declined: { label: "Declined", tone: "danger" },
  cancelled: { label: "Cancelled", tone: "neutral" },
};

/** Sent Offers' vocabulary for an offer's answer. */
const OFFER_STATUS: Record<OfferStatus, Offer["status"]> = {
  sent: { label: "Pending", tone: "warn" },
  accepted: { label: "Accepted", tone: "ok" },
  declined: { label: "Declined", tone: "danger" },
  withdrawn: { label: "Withdrawn", tone: "neutral" },
};

/** Stages the sheet says the Independent hears about, and which movement that is. */
const STAGE_MOVE = {
  invited: "interview_invited",
  proposal_requested: "proposal_requested",
  offer_received: "offer_sent",
} as const;

export function DemoProvider({ children }: { children: ReactNode }) {
  const [saved, setSaved] = usePersisted("team.saved", INITIAL_SAVED);
  const [roles, setRoles] = usePersisted("team.roles", seedRoles);
  const [candidates, setCandidates] = usePersisted("team.candidates", seedCandidates);
  const [offers, setOffers] = usePersisted("team.offers", seedOffers);
  const [cards, setCards] = usePersisted("team.cards", seedCards);
  const [contracts, setContracts] = usePersisted("team.contracts", seedContracts);
  const [interviews, setInterviews] = usePersisted("team.interviews", seedInterviews);
  const [evaluations, setEvaluations] = usePersisted<Record<string, Evaluation[]>>("team.evaluations", {});
  const [profile, setProfileState] = usePersisted("team.profile", TEAM_PROFILE);
  const [company, setCompanyState] = usePersisted("team.company", COMPANY_PROFILE);
  /** OB-002 / TB-096 — the Team Builder's quiz answers: sign-up seeds them, a retake replaces them. */
  const [workStyle, setWorkStyle] = usePersisted<number[]>("team.workStyle", []);
  const live = useLive();
  const deal = useDeal();
  const postings = usePostings();
  const canPublish = COMPANY_FIELDS.every((k) => String(company[k]).trim() !== "") && cards.length > 0;
  /**
   * A role whose last seat was hired reads as Closed — its posting has left the board. Reopening
   * republishes the posting without the filled mark, so the role reads Active again.
   */
  const rolesView = roles.map((r) => (r.status === "Active" && postings.some((p) => p.slug === r.slug && p.filled) ? { ...r, status: "Closed" as const } : r));

  /** Only the live pair emits notifications — everyone else is static background data. */
  const roleOf = (slug: string) => ({ slug, title: roles.find((r) => r.slug === slug)?.title ?? slug });
  const livePair = (c: Candidate | undefined) => c && c.independent === PAIR.independent.slug;
  /**
   * Where the talent's side of the live contract is: their contract lives under the role's slug,
   * not the independent's slug these screens use. Notifications about the contract used to carry
   * ours, so every one of them opened a 404 in the talent's portal.
   */
  const talentSide = (d: Deal) => ({ slug: d.roleSlug, title: d.title });
  const isDealContract = (slug: string) => !!deal?.contract && slug === PAIR.independent.slug;

  /**
   * The one engagement, in this portal's shapes. It is the same record the talent's portal reads,
   * so an application, an accepted interview or a signed offer shows up here without a seed.
   */
  const dealCandidate: Candidate | null = deal
    ? {
        id: DEAL_ID,
        independent: PAIR.independent.slug,
        role: deal.roleSlug,
        stage: stageOf(deal),
        status: dealStatus(deal),
        submitted: `${deal.invited ? "Invited" : "Applied"} ${deal.submitted}`,
        dropped: deal.dropped,
      }
    : null;

  const dealInterview: Interview | null =
    deal?.interview
      ? {
          id: DEAL_ID,
          independent: PAIR.independent.slug,
          role: deal.title,
          roleSlug: deal.roleSlug,
          candidate: DEAL_ID,
          when: deal.interview.when,
          format: deal.interview.format,
          link: deal.interview.link,
          status: INTERVIEW_STATUS[deal.interview.outcome ?? (deal.interview.accepted ? "accepted" : "awaiting")],
          past: deal.interview.past,
        }
      : null;

  const dealOffer: Offer | null = deal?.offer
    ? {
        id: DEAL_ID,
        independent: PAIR.independent.slug,
        role: deal.title,
        sent: deal.offer.updated ?? deal.offer.sent,
        rate: deal.offer.rate,
        start: dayLabel(deal.offer.start),
        status: OFFER_STATUS[deal.offer.status],
        kind: "trial",
        declineReason: deal.offer.declineReason,
      }
    : null;

  const fullTimeOffer: Offer | null = deal?.fullTime
    ? {
        id: FULLTIME_ID,
        independent: PAIR.independent.slug,
        role: `${deal.title} (full-time)`,
        sent: deal.fullTime.sent,
        rate: `${deal.fullTime.salary} /month`,
        start: dayLabel(deal.fullTime.start),
        status: OFFER_STATUS[deal.fullTime.status],
        kind: "full-time",
        declineReason: deal.fullTime.declineReason,
      }
    : null;

  const fullTime = isFullTime(deal) && !!deal?.fullTime;
  const dealContract: Contract | null = deal?.contract
    ? (() => {
        const c = deal.contract;
        const trial = trialStateOf(c);
        const score = fitScoreOf(deal);
        const { activity, streak } = activityOf(c);
        return {
          slug: PAIR.independent.slug,
          independent: PAIR.independent.slug,
          role: deal.title,
          type: fullTime ? "full-time" : "trial",
          // A closed trial is waiting on, or has, its evaluation; "On track" beside "Closed early" said neither.
          status: c.ended ? { label: "Ended", tone: "neutral" } : fullTime ? { label: "Active", tone: "ok" } : trial.over ? (evaluationsOf(c).length ? { label: "Evaluation sent", tone: "ok" } : { label: "Evaluation due", tone: "warn" }) : { label: "On track", tone: "ok" },
          progress: c.objectives.length ? Math.round((c.objectives.filter((o) => o.status === "complete").length / c.objectives.length) * 100) : 0,
          progressLabel: fullTime ? "Objectives complete" : "Trial progress",
          started: dayLabel(fullTime ? deal.fullTime!.start : c.started),
          day: fullTime ? reviewQuarter(deal.fullTime!.start) : trial.day,
          ends: fullTime ? "Ongoing" : dayLabel(c.ends),
          left: fullTime ? null : trial.left,
          over: !fullTime && trial.over,
          endedOn: c.ended ? c.endedOn : undefined,
          rate: fullTime ? `${deal.fullTime!.salary} /month` : c.rate,
          manager: profile.name,
          objectives: dealObjectivesFrom(c, fullTime),
          tfs: { overall: score.overall, performance: score.performance, profile: score.profile, workStyle: score.workStyle, evaluation: score.evaluation },
          phase: fullTime ? 4 : score.phase,
          activity,
          streak,
        } satisfies Contract;
      })()
    : null;

  // Once the pair applies, the deal is their card for that role; the "Invited to apply" row it
  // grew out of would otherwise sit beside it as a second copy of the same person.
  const allCandidates: Candidate[] = dealCandidate
    ? [dealCandidate, ...candidates.filter((c) => !(c.independent === dealCandidate.independent && c.role === dealCandidate.role))]
    : candidates;
  const allInterviews: Interview[] = dealInterview ? [dealInterview, ...interviews] : interviews;
  const allOffers: Offer[] = [...(fullTimeOffer ? [fullTimeOffer] : []), ...(dealOffer ? [dealOffer] : []), ...offers];
  const allContracts: Contract[] = dealContract ? [dealContract, ...contracts] : contracts;
  /** The live contract's evaluations come off the shared record, so the talent reads the same ones. */
  const allEvaluations: Record<string, Evaluation[]> = deal?.contract
    ? { ...evaluations, [PAIR.independent.slug]: evaluationsOf(deal.contract).map((e) => ({ stars: e.stars, scores: e.scores, feedback: e.feedback, recommendation: e.recommendation, date: e.date, tfp: e.tfp ?? 0 })) }
    : evaluations;

  /**
   * TB-084 / AD-042 — the live contract's money in this ledger: the deposit when the trial
   * started, then every release and dispute refund recorded in the shared store. The deposit is
   * what was actually funded with the offer, not the rate string.
   */
  const ref = contractRefOf(deal);
  const dealLedger: Transaction[] = [];
  if (deal?.contract && ref) {
    const name = `${deal.title} — trial`;
    const href = `/team/independents/${ref.links.team}?tab=contract`;
    const escrow = escrowOf(deal, []);
    const total = escrow?.total ?? rateAmount(deal.contract.rate);
    const held = escrow?.held ?? 0;
    const fee = deal.offer?.deposit?.fee;
    const started = parseDay(deal.contract.started);
    const row = (t: Omit<Transaction, "independent" | "contract" | "contractHref" | "detail"> & { drawerStatus: string; lines: [string, string][] }): Transaction => ({
      ...t,
      independent: PAIR.independent.name,
      contract: name,
      contractHref: href,
      detail: { time: t.date, drawerStatus: t.drawerStatus, rows: [["Contract", name], ["Independent", PAIR.independent.name], ...t.lines], breakdown: [[t.desc, t.amount]], total: t.amount, timeline: [{ title: t.desc, date: t.date, done: true }] },
    });
    dealLedger.push(
      ...live.payments
        // Rows recorded before the slug fix carry the Team Builder's slug for the contract.
        .filter((p) => p.contract === ref.links.independent || p.contract === ref.links.team)
        .map((p) =>
          p.kind === "refunded"
            ? row({ id: p.id, date: p.date, at: p.at, desc: "Refunded after a dispute ruling", type: "Payment Refunded", amount: p.amount, status: { label: "Refunded", tone: "neutral" }, drawerStatus: "Refunded to your card", lines: [["Ruling", p.period]] })
            : row({ id: p.id, date: p.date, at: p.at, desc: `Released to ${PAIR.independent.name}`, type: "Payment Released", amount: p.amount, status: { label: "Released", tone: "ok" }, drawerStatus: "Released", lines: [["Period", p.period]] }),
        ),
      row({
        id: `deposit-${ref.key}`,
        date: dayLabel(deal.contract.started),
        at: started ? started.getFullYear() * 10000 + (started.getMonth() + 1) * 100 + started.getDate() : 0,
        desc: "Escrow deposit",
        type: "Payment Deposited",
        amount: usd(total),
        status: held > 0 ? { label: "Held", tone: "warn" } : { label: "Settled", tone: "neutral" },
        drawerStatus: held > 0 ? "Held in escrow" : "Settled",
        lines: [["Still in escrow", usd(held)], ...(fee ? ([["Platform fee (charged separately)", usd(fee)]] as [string, string][]) : [])],
      }),
    );
  }
  const transactions = [...dealLedger, ...seedTransactions];

  /** Rewrites one objective of the live contract, stamping what happened in its history. */
  const patchObjective = (objectiveId: string, fn: (o: ContractObjective) => ContractObjective) =>
    updateDeal((d) => (d.contract ? { ...d, contract: { ...d.contract, objectives: d.contract.objectives.map((o) => (o.id === objectiveId ? fn(o) : o)) } } : d));

  const value: Demo = {
    saved,
    toggleSaved: (slug) => setSaved((s) => (s.includes(slug) ? s.filter((x) => x !== slug) : [...s, slug])), // TB-018 / TB-022: silent, no notification
    roles: rolesView,
    canPublish,
    addRole: (r) => {
      // TB-026 — an Active role is a posting the talent can find and apply to; a draft is not.
      // The checklist's lock holds here too: without a company profile and a card it saves as a draft.
      const role = r.status === "Active" && !canPublish ? { ...r, status: "Draft" as const } : r;
      setRoles((rs) => [role, ...rs.filter((x) => x.slug !== role.slug)]);
      if (role.status === "Active") publishPosting(postingFrom(role, company));
      else closePosting(role.slug);
    },
    duplicateRole: (slug) => {
      const source = roles.find((r) => r.slug === slug);
      if (!source) return undefined;
      // Unique slug so the copy sits alongside the original rather than replacing it.
      let copy = `${slug}-copy`;
      for (let n = 2; roles.some((r) => r.slug === copy); n++) copy = `${slug}-copy-${n}`;
      // A duplicate starts as an empty Draft: the pipeline belongs to the role it was cloned from.
      // duplicatedFrom lets the wizard open this draft straight on Review (TB-035) — every field
      // is already filled, so there is nothing to walk back through.
      setRoles((rs) => [{ ...source, slug: copy, title: `${source.title} (copy)`, status: "Draft", updated: today(), duplicatedFrom: slug, candidates: null, matched: null, interviews: null, offers: null, hired: null }, ...rs]);
      return copy;
    },
    setRoleStatus: (slug, status) => {
      if (status === "Active" && !canPublish) return;
      setRoles((rs) => rs.map((r) => (r.slug === slug ? { ...r, status, updated: today() } : r)));
      const role = roles.find((r) => r.slug === slug);
      if (role && status === "Active") publishPosting(postingFrom({ ...role, status }, company));
      else closePosting(slug);
    },
    removeRole: (slug) => {
      setRoles((rs) => rs.filter((r) => r.slug !== slug));
      closePosting(slug);
    },
    candidates: allCandidates,
    canChat: canMessage(deal),
    setStage: (id, stage, status, notify) => {
      const c = allCandidates.find((x) => x.id === id);
      const kind = notify === undefined ? STAGE_MOVE[stage as keyof typeof STAGE_MOVE] : notify || undefined;
      if (kind && livePair(c)) move(kind, roleOf(c!.role));
      // Moving the shared engagement moves it on the talent's side too.
      if (id === DEAL_ID) return updateDeal((d) => ({ ...d, stage }));
      setCandidates((cs) => cs.map((x) => (x.id === id ? { ...x, stage, status } : x)));
    },
    requestProposal: (id, note) => {
      const c = allCandidates.find((x) => x.id === id);
      if (!c) return;
      if (livePair(c)) move("proposal_requested", roleOf(c.role));
      if (id === DEAL_ID) return updateDeal((d) => ({ ...d, stage: "proposal_requested", proposalRequest: { note: note?.trim() || undefined, date: today() } }));
      setCandidates((cs) => cs.map((x) => (x.id === id ? { ...x, stage: "proposal_requested", status: { label: "Awaiting proposal", tone: "warn", meta: "Sent today" } } : x)));
    },
    requestRevision: (id, note) => {
      const c = allCandidates.find((x) => x.id === id);
      if (livePair(c)) move("proposal_revision", roleOf(c!.role));
      if (id === DEAL_ID) return updateDeal((d) => ({ ...d, stage: "proposal_requested", revision: { note, date: today() } }));
      setCandidates((cs) => cs.map((x) => (x.id === id ? { ...x, stage: "proposal_requested", status: { label: "Revision requested", tone: "warn", meta: "v1 · today" } } : x)));
    },
    declineProposal: (id, reason) => {
      const c = allCandidates.find((x) => x.id === id);
      if (!c) return;
      if (livePair(c)) move("proposal_declined", roleOf(c.role));
      // TB-107: a declined proposal belongs in Dropped, and the talent's own card has to say so.
      if (id === DEAL_ID) return updateDeal((d) => ({ ...d, dropped: true, proposalDeclined: { reason: reason?.trim() || undefined, date: today() } }));
      setCandidates((cs) => cs.map((x) => (x.id === id ? { ...x, dropped: true, status: { label: "Proposal declined", tone: "danger" } } : x)));
    },
    setDropped: (id, dropped) => {
      // Undropping puts them back where they were — a declined proposal is back in review.
      if (id === DEAL_ID) return updateDeal((d) => ({ ...d, dropped, proposalDeclined: dropped ? d.proposalDeclined : undefined }));
      setCandidates((cs) => cs.map((c) => (c.id === id ? { ...c, dropped } : c))); // TB-044: not notified
    },
    inPipeline: (independent) => allCandidates.some((c) => c.independent === independent && !c.dropped),
    pipelineOf: (independent) => allCandidates.find((c) => c.independent === independent && !c.dropped),
    invite: (independent, role) => {
      if (allCandidates.some((c) => c.independent === independent && c.role === role)) return;
      if (independent === PAIR.independent.slug) move("invite", roleOf(role));
      setCandidates((cs) => [{ id: `c${Date.now()}`, independent, role, stage: "matched", status: { label: "Invited to apply", tone: "info" }, submitted: "Invited just now" }, ...cs]);
    },
    interviews: allInterviews,
    inviteToInterview: (candidateId, slot) => {
      const c = allCandidates.find((x) => x.id === candidateId);
      if (!c) return;
      const role = roleOf(c.role);
      const interview = { when: slot.when, format: slot.format, link: slot.link, note: slot.note?.trim() || undefined };
      if (candidateId === DEAL_ID) {
        if (livePair(c)) move("interview_invited", role);
        return updateDeal((d) => ({ ...d, stage: "invited", interview }));
      }
      // The pair without an engagement: start it at the interview, so the invitation has an
      // application to land on in their pipeline. (One engagement at a time — a second role for
      // the pair stays on this side only rather than overwrite the first.)
      if (livePair(c) && !deal && startDeal({ roleSlug: c.role, title: role.title, company: PAIR.team.company, match: byName(c.independent).match, stage: "invited", invited: true, interview })) {
        move("interview_invited", role);
        return;
      }
      const [day, time] = slot.when.split(", ");
      setCandidates((cs) => cs.map((x) => (x.id === candidateId ? { ...x, stage: "invited", status: { label: "Awaiting reply", tone: "neutral", meta: `${day} · ${time}` } } : x)));
      setInterviews((is) => [
        { id: `iv${Date.now()}`, independent: c.independent, role: role.title, roleSlug: c.role, candidate: c.id, when: slot.when, format: slot.format, link: slot.link, status: INTERVIEW_STATUS.awaiting },
        ...is.filter((i) => i.candidate !== c.id || i.past),
      ]);
    },
    rescheduleInterview: (id, when) => {
      const iv = allInterviews.find((i) => i.id === id);
      if (!iv) return;
      if (id === DEAL_ID) {
        if (deal) move("interview_rescheduled", roleOf(deal.roleSlug));
        return updateDeal((d) => (d.interview ? { ...d, stage: "invited", interview: { ...d.interview, when, accepted: false, past: false, outcome: undefined } } : d));
      }
      setInterviews((is) => is.map((i) => (i.id === id ? { ...i, when, status: INTERVIEW_STATUS.awaiting } : i)));
    },
    cancelInterview: (id) => {
      const iv = allInterviews.find((i) => i.id === id);
      if (!iv) return;
      if (id === DEAL_ID) {
        if (deal) move("interview_cancelled", roleOf(deal.roleSlug));
        return updateDeal((d) => (d.interview ? { ...d, stage: "invited", interview: { ...d.interview, past: true, outcome: "cancelled" } } : d));
      }
      setInterviews((is) => is.map((i) => (i.id === id ? { ...i, status: INTERVIEW_STATUS.cancelled, past: true } : i)));
      if (iv.candidate) setCandidates((cs) => cs.map((x) => (x.id === iv.candidate ? { ...x, stage: "invited", status: { label: INTERVIEW_CANCELLED, tone: "neutral" } } : x)));
    },
    completeInterview: (id) => {
      const c = allCandidates.find((x) => x.id === id);
      if (!c) return;
      if (id === DEAL_ID) return updateDeal((d) => ({ ...d, stage: "interviewed", interview: d.interview && { ...d.interview, past: true, outcome: "done" } }));
      setCandidates((cs) => cs.map((x) => (x.id === id ? { ...x, stage: "interviewed", status: { label: "Interview completed", tone: "ok" } } : x)));
      setInterviews((is) => is.map((i) => (i.candidate === c.id && !i.past ? { ...i, status: INTERVIEW_STATUS.done, past: true } : i)));
    },
    contracts: allContracts,
    reviewObjective: (slug, objectiveId, verdict, reason) => {
      const d = getDeal();
      if (!isDealContract(slug) || !d?.contract) return;
      const note = reason?.trim();
      if (verdict !== "approve" && !note) return;
      const at = momentLabel();
      patchObjective(objectiveId, (o) =>
        verdict === "approve"
          ? { ...o, status: "complete", progress: 100, retired: true, meta: `Achieved · approved ${today()}`, activity: [{ at, text: `Approved by ${profile.name}` }, ...(o.activity ?? [])] }
          : {
              ...o,
              // TB-111 — a revision request is its own status, so the talent reads "Revision requested", not "Off track".
              status: verdict === "revise" ? "revision" : "on",
              // A Default objective is binary: sent back, it is not done any more.
              progress: o.kind === "task" ? 0 : o.progress,
              meta: `${verdict === "revise" ? "Revision requested" : "Sent back"} · ${note}`,
              activity: [{ at, text: `${verdict === "revise" ? "Revision requested" : "Rejected"} by ${profile.name} — ${note}` }, ...(o.activity ?? [])],
            },
      );
      move(verdict === "approve" ? "objective_approved" : verdict === "revise" ? "objective_revision" : "objective_rejected", talentSide(d));
    },
    createObjective: (slug, o) => {
      const d = getDeal();
      if (!isDealContract(slug) || !d?.contract) {
        setContracts((cs) => cs.map((c) => (c.slug === slug ? { ...c, objectives: [...c.objectives, { id: `o${Date.now()}`, title: o.title, description: o.description, kind: o.kind, progress: 0, status: "on" as const, meta: "No update yet", target: o.target, unit: o.unit }] } : c)));
        return;
      }
      const objective = objectiveFrom({ id: `o${Date.now()}`, title: o.title, description: o.description, kind: o.kind, target: o.target, unit: o.unit, keyResults: o.keyResults?.map((title, i) => ({ id: `kr-${i + 1}`, title })) });
      updateDeal((x) => (x.contract ? { ...x, contract: { ...x.contract, objectives: [...x.contract.objectives, { ...objective, activity: [{ at: momentLabel(), text: `Assigned by ${profile.name}` }] }] } } : x));
      move("objective_assigned", talentSide(d));
    },
    commentOnObjective: (slug, objectiveId, text) => {
      const body = text.trim();
      if (!body || !isDealContract(slug)) return;
      patchObjective(objectiveId, (o) => ({ ...o, comments: [...(o.comments ?? []), { side: "team", name: profile.name, at: momentLabel(), text: body }] }));
    },
    endContract: (slug) => {
      if (deal?.contract && dealContract && slug === dealContract.slug) {
        const escrow = escrowOf(deal, getDisputes());
        // TB-071 — a dispute keeps its amount in escrow until support rules; ending can't release it.
        if (escrow && escrow.onHold > 0) return false;
        const remaining = escrow?.held ?? 0;
        updateDeal((d) => (d.contract ? { ...d, contract: { ...d.contract, ended: true, endedOn: today(), escrow: { released: (d.contract.escrow?.released ?? 0) + remaining, refunded: d.contract.escrow?.refunded ?? 0 } } } : d));
        // IN-051 — ending is when the money moves, so it lands in the independent's ledger, under
        // their slug for the contract.
        if (remaining > 0) recordPayment({ contract: deal.roleSlug, title: deal.title, company: PAIR.team.company, amount: usd(remaining), period: `${dayLabel(deal.contract.started)} – ${dayLabel(deal.contract.ends)}` });
        move("contract_ended", talentSide(deal));
        return true;
      }
      setContracts((cs) => cs.map((c) => (c.slug === slug ? { ...c, status: { label: "Ended", tone: "neutral" as const }, progressLabel: "Contract complete" } : c)));
      return true;
    },
    transactions,
    evaluations: allEvaluations,
    addEvaluation: (slug, e) => {
      // IN-034 — the evaluation belongs to the shared contract, so the talent's side and Admin's
      // process check (AD-033) read the one that was submitted, scores included.
      if (deal?.contract && dealContract && slug === dealContract.slug) {
        updateDeal((d) => (d.contract ? { ...d, contract: { ...d.contract, evaluations: [{ stars: e.stars, scores: e.scores, feedback: e.feedback, recommendation: e.recommendation, date: today(), tfp: e.tfp }, ...evaluationsOf(d.contract)] } } : d));
        move("evaluation_sent", talentSide(deal));
        return;
      }
      setEvaluations((all) => ({ ...all, [slug]: [{ ...e, date: today() }, ...(all[slug] ?? [])] }));
    },
    offers: allOffers,
    sendOffer: ({ rate, start, end, objectives, deposit }) => {
      const d = getDeal();
      if (!d) return;
      move("offer_sent", talentSide(d));
      updateDeal((x) => ({ ...x, stage: "offer_received", dropped: false, proposalDeclined: undefined, offer: { rate, start, end, objectives, deposit, status: "sent", sent: today() } }));
    },
    updateOffer: ({ rate, start, end, deposit }) => {
      const d = getDeal();
      if (!d?.offer || d.offer.status === "accepted") return;
      move("offer_updated", talentSide(d));
      updateDeal((x) => (x.offer ? { ...x, stage: "offer_received", offer: { ...x.offer, rate, start, end, deposit, status: "sent", updated: today(), declineReason: undefined } } : x));
    },
    withdrawOffer: (id) => {
      const d = getDeal();
      if (id === DEAL_ID && d?.offer?.status === "sent") {
        move("offer_withdrawn", talentSide(d));
        // Back to the proposal: it is still on file, and a new offer can go out from it.
        updateDeal((x) => (x.offer ? { ...x, stage: "proposal_sent", offer: { ...x.offer, status: "withdrawn" } } : x));
        return;
      }
      if (id === FULLTIME_ID && d?.fullTime?.status === "sent") {
        move("fulltime_withdrawn", talentSide(d));
        updateDeal((x) => (x.fullTime ? { ...x, fullTime: { ...x.fullTime, status: "withdrawn" } } : x));
        return;
      }
      setOffers((os) => os.map((o) => (o.id === id ? { ...o, status: OFFER_STATUS.withdrawn } : o)));
    },
    sendFullTimeOffer: ({ salary, start, benefits }) => {
      const d = getDeal();
      if (!d?.contract) return;
      updateDeal((x) => ({ ...x, fullTime: { salary: `$${salary.replace(/^\$/, "")}`, start, benefits, status: "sent", sent: today() } }));
      move("fulltime_offer", talentSide(d));
    },
    addOffer: (o) => setOffers((os) => [o, ...os]),
    setOffer: (id, patch) => setOffers((os) => os.map((o) => (o.id === id ? { ...o, ...patch } : o))),
    cards,
    addCard: (c) => setCards((cs) => (c.isDefault ? cs.map((x) => ({ ...x, isDefault: false })) : cs).concat(c)),
    removeCard: (id) =>
      setCards((cs) => {
        const next = cs.filter((c) => c.id !== id);
        return next.some((c) => c.isDefault) ? next : next.map((c, i) => ({ ...c, isDefault: i === 0 }));
      }),
    setDefaultCard: (id) => setCards((cs) => cs.map((c) => ({ ...c, isDefault: c.id === id }))),
    profile,
    setProfile: (patch) => setProfileState((x) => ({ ...x, ...patch })),
    company,
    setCompany: (patch) => setCompanyState((x) => ({ ...x, ...patch })),
    workStyle,
    setWorkStyle,
    notifications: live.team,
    markRead: (id) => markLiveRead("team", id),
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useDemo(): Demo {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useDemo must be used inside <DemoProvider>");
  return ctx;
}
