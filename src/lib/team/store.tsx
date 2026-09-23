"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { Stage } from "@/components/independent/ui";
import { DEAL_ID, dealObjectivesFrom, postingFrom } from "@/lib/team/deal-view";
import { canMessage, publishPosting, stageOf, startDeal, today, trialDay, unpublishPosting, updateDeal, useDeal, usePostings } from "@/lib/demo/deal";
import type { Deal } from "@/lib/demo/deal";
import { dealContract as contractRefOf, escrowOf, getDisputes, rateAmount, usd } from "@/lib/demo/disputes";
import { markRead as markLiveRead, move, PAIR, recordPayment, useLive, usePersisted } from "@/lib/demo/live";
import type { MoveKind } from "@/lib/demo/live";
import { byName, COMPANY_PROFILE, INITIAL_SAVED, INTERVIEW_CANCELLED, INTERVIEW_DECLINED, TEAM_PROFILE, candidates as seedCandidates, contracts as seedContracts, interviews as seedInterviews, offers as seedOffers, paymentMethods as seedCards, roles as seedRoles, transactions as seedTransactions } from "./data";
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
  candidates: Candidate[];
  /** The thread only exists from the interview onwards — the same point the talent sees it open. */
  canChat: boolean;
  /**
   * `notify` overrides which notification fires: omitted infers it from the stage, `false`
   * stays silent, and a kind names it outright — a revision request and a first request both
   * land on the same stage, so inference alone would send the wrong one (and send it twice).
   */
  setStage: (id: string, stage: Stage, status?: Candidate["status"], notify?: MoveKind | false) => void;
  /** TB-106 — sends the proposal back with the note the talent revises against. */
  requestRevision: (id: string, note: string) => void;
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
  inviteToInterview: (candidateId: string, slot: { when: string; format: string; link?: string }) => void;
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
  /** TB-075/109 — objectives live on the contract, so creates and verdicts survive a reload. */
  setObjectives: (slug: string, fn: (os: Objective[]) => Objective[]) => void;
  /**
   * TB-067 — record the evaluation so End Contract and Hire for Full-Time unlock. A list, not a
   * single entry: TB-117 lets a full-time contract be evaluated repeatedly, and TB-081 wants the
   * whole history. Newest first.
   */
  evaluations: Record<string, Evaluation[]>;
  addEvaluation: (slug: string, e: Omit<Evaluation, "date">) => void;
  offers: Offer[];
  addOffer: (o: Offer) => void;
  /** TB-105 — the offer the talent actually opens: terms plus the objectives it commits them to. */
  sendOffer: (offer: { rate: string; start: string; end: string; objectives: { id: string; title: string; kind: Objective["kind"]; target?: number; unit?: string; dailyTarget?: number }[] }) => void;
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
  notifications: Notification[];
  markRead: (id?: string) => void;
};

const Ctx = createContext<Demo | null>(null);

/** The Team Builder's status line for the deal, most advanced fact first. */
function dealStatus(deal: Deal): Candidate["status"] {
  if (deal.stage === "hired") return { label: "Hired · trial running", tone: "ok" };
  if (deal.offer?.status === "declined") return { label: "Offer declined", tone: "danger" };
  if (deal.offer?.status === "sent") return { label: "Offer sent", tone: "warn", meta: `Starts ${deal.offer.start}` };
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
  /** OB-002 — tags generated by the sign-up quiz, handed over before this store mounts. */
  const [signupTags] = usePersisted<string[] | null>("team.companyTags", null);
  const live = useLive();
  const deal = useDeal();
  const postings = usePostings();
  /**
   * A role whose last seat was hired reads as Closed — its posting has left the board. Reopening
   * republishes the posting without the filled mark, so the role reads Active again.
   */
  const rolesView = roles.map((r) => (r.status === "Active" && postings.some((p) => p.slug === r.slug && p.filled) ? { ...r, status: "Closed" as const } : r));

  /** Only the live pair emits notifications — everyone else is static background data. */
  const roleOf = (slug: string) => ({ slug, title: roles.find((r) => r.slug === slug)?.title ?? slug });
  const livePair = (c: Candidate | undefined) => c && c.independent === PAIR.independent.slug;

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

  const dealOffer: Offer | null =
    deal?.offer
      ? {
          id: DEAL_ID,
          independent: PAIR.independent.slug,
          role: deal.title,
          sent: deal.offer.sent,
          rate: deal.offer.rate,
          start: deal.offer.start,
          status: deal.offer.status === "accepted" ? { label: "Accepted", tone: "ok" } : deal.offer.status === "declined" ? { label: "Declined", tone: "danger" } : { label: "Pending", tone: "warn" },
        }
      : null;

  const dealContract: Contract | null = deal?.contract
    ? {
        slug: PAIR.independent.slug,
        independent: PAIR.independent.slug,
        role: deal.title,
        type: "trial",
        status: deal.contract.ended ? { label: "Ended", tone: "neutral" } : { label: "On track", tone: "ok" },
        progress: deal.contract.objectives.length ? Math.round((deal.contract.objectives.filter((o) => o.status === "complete").length / deal.contract.objectives.length) * 100) : 0,
        progressLabel: "Trial progress",
        started: deal.contract.started,
        day: trialDay(deal.contract.started),
        ends: deal.contract.ends,
        rate: deal.contract.rate,
        manager: profile.name,
        objectives: dealObjectivesFrom(deal.contract),
        // A trial that has just started has no score history yet; it builds as objectives land.
        tfs: { overall: 0, performance: 0, profile: 0, workStyle: 0 },
        phase: 3,
        activity: deal.contract.activity,
        streak: deal.contract.streak,
      }
    : null;

  // Once the pair applies, the deal is their card for that role; the "Invited to apply" row it
  // grew out of would otherwise sit beside it as a second copy of the same person.
  const allCandidates: Candidate[] = dealCandidate
    ? [dealCandidate, ...candidates.filter((c) => !(c.independent === dealCandidate.independent && c.role === dealCandidate.role))]
    : candidates;
  const allInterviews: Interview[] = dealInterview ? [dealInterview, ...interviews] : interviews;
  const allOffers: Offer[] = dealOffer ? [dealOffer, ...offers] : offers;
  const allContracts: Contract[] = dealContract ? [dealContract, ...contracts] : contracts;

  /**
   * TB-084 / AD-042 — the live contract's money in this ledger: the deposit at acceptance, then
   * every release and dispute refund recorded in the shared store. It used to be the seed alone,
   * so neither an escrow release nor a refund ever showed up on the Team Builder's side.
   */
  const ref = contractRefOf(deal);
  const dealLedger: Transaction[] = [];
  if (deal?.contract && ref) {
    const name = `${deal.title} — trial`;
    const href = `/team/independents/${ref.links.team}?tab=contract`;
    const total = rateAmount(deal.contract.rate);
    const held = escrowOf(deal, [])?.held ?? 0;
    const stamp = (ms: number) => {
      const d = new Date(ms);
      return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
    };
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
        date: deal.contract.started,
        at: stamp(Date.parse(deal.contract.started)),
        desc: "Escrow deposit",
        type: "Payment Deposited",
        amount: usd(total),
        status: held > 0 ? { label: "Held", tone: "warn" } : { label: "Settled", tone: "neutral" },
        drawerStatus: held > 0 ? "Held in escrow" : "Settled",
        lines: [["Still in escrow", usd(held)]],
      }),
    );
  }
  const transactions = [...dealLedger, ...seedTransactions];

  const value: Demo = {
    saved,
    toggleSaved: (slug) => setSaved((s) => (s.includes(slug) ? s.filter((x) => x !== slug) : [...s, slug])), // TB-018 / TB-022: silent, no notification
    roles: rolesView,
    addRole: (r) => {
      setRoles((rs) => [r, ...rs.filter((x) => x.slug !== r.slug)]);
      // TB-026 — an Active role is a posting the talent can find and apply to; a draft is not.
      if (r.status === "Active") publishPosting(postingFrom(r, company));
      else unpublishPosting(r.slug);
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
      setRoles((rs) => [{ ...source, slug: copy, title: `${source.title} (copy)`, status: "Draft", updated: "Today", duplicatedFrom: slug, candidates: null, matched: null, interviews: null, offers: null, hired: null }, ...rs]);
      return copy;
    },
    setRoleStatus: (slug, status) => {
      setRoles((rs) => rs.map((r) => (r.slug === slug ? { ...r, status } : r)));
      const role = roles.find((r) => r.slug === slug);
      if (role && status === "Active") publishPosting(postingFrom({ ...role, status }, company));
      else unpublishPosting(slug);
    },
    removeRole: (slug) => {
      setRoles((rs) => rs.filter((r) => r.slug !== slug));
      unpublishPosting(slug);
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
    requestRevision: (id, note) => {
      const c = allCandidates.find((x) => x.id === id);
      if (livePair(c)) move("proposal_revision", roleOf(c!.role));
      if (id === DEAL_ID) return updateDeal((d) => ({ ...d, stage: "proposal_requested", revision: { note, date: today() } }));
      setCandidates((cs) => cs.map((x) => (x.id === id ? { ...x, stage: "proposal_requested", status: { label: "Revision requested", tone: "warn", meta: "v1 · today" } } : x)));
    },
    setDropped: (id, dropped) => {
      if (id === DEAL_ID) return updateDeal((d) => ({ ...d, dropped }));
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
      if (livePair(c)) move("interview_invited", role);
      const interview = { when: slot.when, format: slot.format, link: slot.link };
      if (candidateId === DEAL_ID) return updateDeal((d) => ({ ...d, stage: "invited", interview }));
      // The pair without an engagement: start it at the interview, so the invitation has an
      // application to land on in their pipeline. (One engagement at a time — a second role for
      // the pair stays on this side only rather than overwrite the first.)
      if (livePair(c) && !deal) return startDeal({ roleSlug: c.role, title: role.title, company: PAIR.team.company, match: byName(c.independent).match, stage: "invited", invited: true, interview });
      const [day, time] = slot.when.split(", ");
      setCandidates((cs) => cs.map((x) => (x.id === candidateId ? { ...x, stage: "invited", status: { label: "Awaiting reply", tone: "neutral", meta: `${day} · ${time}` } } : x)));
      setInterviews((is) => [
        { id: `iv${Date.now()}`, independent: c.independent, role: role.title, roleSlug: c.role, candidate: c.id, ...interview, status: INTERVIEW_STATUS.awaiting },
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
    setObjectives: (slug, fn) => {
      // A verdict on a shared objective is what the talent sees on their own tracker.
      if (dealContract && slug === dealContract.slug) {
        return updateDeal((d) => {
          if (!d.contract) return d;
          const next = fn(dealObjectivesFrom(d.contract));
          return { ...d, contract: { ...d.contract, objectives: d.contract.objectives.map((o) => { const u = next.find((x) => x.id === o.id); return u ? { ...o, progress: u.progress, status: u.status, meta: u.meta, updated: u.updated } : o; }) } };
        });
      }
      setContracts((cs) => cs.map((c) => (c.slug === slug ? { ...c, objectives: fn(c.objectives) } : c)));
    },
    endContract: (slug) => {
      if (deal?.contract && dealContract && slug === dealContract.slug) {
        const escrow = escrowOf(deal, getDisputes());
        // TB-071 — a dispute keeps its amount in escrow until support rules; ending can't release it.
        if (escrow && escrow.onHold > 0) return false;
        const remaining = escrow?.held ?? 0;
        updateDeal((d) => (d.contract ? { ...d, contract: { ...d.contract, ended: true, escrow: { released: (d.contract.escrow?.released ?? 0) + remaining, refunded: d.contract.escrow?.refunded ?? 0 } } } : d));
        // IN-051 — ending is when the money moves, so it lands in the independent's ledger, under
        // their slug for the contract (it used to be ours, so their contract tab never listed it).
        if (remaining > 0) recordPayment({ contract: deal.roleSlug, title: deal.title, company: PAIR.team.company, amount: usd(remaining), period: `${deal.contract.started} – ${deal.contract.ends}` });
        return true;
      }
      setContracts((cs) => cs.map((c) => (c.slug === slug ? { ...c, status: { label: "Ended", tone: "neutral" as const }, progressLabel: "Contract complete" } : c)));
      return true;
    },
    transactions,
    evaluations,
    addEvaluation: (slug, e) => {
      setEvaluations((all) => ({ ...all, [slug]: [{ ...e, date: "Today" }, ...(all[slug] ?? [])] }));
      // IN-034 — the evaluation belongs to the shared contract too, so the talent's side and
      // Admin's process check (AD-033) can see that it was submitted.
      if (dealContract && slug === dealContract.slug)
        updateDeal((d) => (d.contract ? { ...d, contract: { ...d.contract, evaluation: { stars: e.stars, feedback: e.feedback, recommendation: e.recommendation, date: today() } } } : d));
    },
    offers: allOffers,
    sendOffer: ({ rate, start, end, objectives }) =>
      updateDeal((d) => ({ ...d, stage: "offer_received", offer: { rate, start, end, objectives, status: "sent", sent: today() } })),
    addOffer: (o) => {
      // TB-105 — an offer to the pair is the offer the talent opens and signs.
      if (o.independent === PAIR.independent.slug && deal) {
        return updateDeal((d) => ({
          ...d,
          stage: "offer_received",
          offer: { rate: o.rate, start: o.start, end: o.start, objectives: d.offer?.objectives ?? [], status: "sent", sent: o.sent },
        }));
      }
      setOffers((os) => [o, ...os]);
    },
    setOffer: (id, patch) => {
      if (id === DEAL_ID) return updateDeal((d) => (d.offer ? { ...d, offer: { ...d.offer, rate: patch.rate ?? d.offer.rate, start: patch.start ?? d.offer.start } } : d));
      setOffers((os) => os.map((o) => (o.id === id ? { ...o, ...patch } : o)));
    },
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
    company: signupTags?.length ? { ...company, tags: signupTags } : company,
    setCompany: (patch) => setCompanyState((x) => ({ ...x, ...patch })),
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
