"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { Stage } from "@/components/independent/ui";
import { canMessage, clearDeal, fillPosting, getDeal, stageOf, startDeal, today, trialDay, updateDeal, useDeal } from "@/lib/demo/deal";
import type { Deal, DealProposal } from "@/lib/demo/deal";
import { markRead as markLiveRead, move, useLive, usePersisted } from "@/lib/demo/live";
import type { MoveKind } from "@/lib/demo/live";
import { KEY_RESULTS, krValue } from "@/lib/team/data";
import type { KeyResult } from "@/lib/team/data";
import { INITIAL_SAVED, applications as seedApps, contracts as seedContracts, interviews as seedInterviews, ME, payoutMethods as seedPayouts, profile as seedProfile, tagsFor, transactions as seedTransactions, WORK_STYLE_ANSWERS } from "./data";
import type { Application, Contract, Interview, Notification, Objective, PayoutMethod, Transaction } from "./data";

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
   * `notify` overrides which notification fires: omitted infers it from the stage, `false` stays
   * silent, and a kind names it outright — declining an offer stays on the same stage, so
   * inference alone would say nothing at all.
   */
  setStage: (id: string, stage: Stage, status?: Application["status"], notify?: MoveKind | false) => void;
  withdraw: (id: string) => void;
  apply: (roleSlug: string, title: string, company: string, match: number) => void;
  /** IN-072 / IN-073 — saves the proposal on the shared engagement so the Team Builder reviews what was sent. */
  submitProposal: (id: string, proposal: Omit<DealProposal, "version" | "sent">) => void;
  withdrawnRoleSlugs: string[];
  /** IN-076 — progress updates have to survive a reload, so the contracts live here, not in page state. */
  contracts: Contract[];
  setObjectives: (slug: string, fn: (os: Objective[]) => Objective[]) => void;
  /** IN-030 — key results with the tasks this session has ticked applied, so progress is derived. */
  keyResults: KeyResult[];
  markTask: (krId: string, taskId: string) => void;
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
  if (deal.stage === "hired") return { label: "Hired · trial running", tone: "ok" };
  if (deal.offer?.status === "declined") return { label: "Declined", tone: "danger" };
  if (deal.offer?.status === "sent") return { label: "Offer received", tone: "ok" };
  if (deal.revision) return { label: "Revision requested", tone: "warn", meta: deal.revision.date };
  if (deal.stage === "proposal_sent" && deal.proposal) return { label: "Proposal submitted", tone: "info", meta: `v${deal.proposal.version} · ${deal.proposal.sent}` };
  if (deal.stage === "proposal_requested") return { label: "Proposal requested", tone: "warn" };
  if (deal.stage === "interviewed") return { label: "Interview completed", tone: "ok", meta: deal.interview?.when };
  // IN-071 / TB-037 — a declined or cancelled slot says so until a new one is offered.
  if (deal.interview?.outcome === "declined") return { label: "Declined", tone: "danger", meta: deal.interview.when };
  if (deal.interview?.outcome === "cancelled") return { label: "Interview cancelled", tone: "neutral", meta: deal.interview.when };
  if (deal.interview?.accepted) return { label: "Interview confirmed", tone: "info", meta: deal.interview.when };
  if (deal.interview) return { label: "Interview invitation", tone: "warn", meta: deal.interview.when };
  return undefined;
}

/** The deal's contract as the talent's tracker reads it. Fields the trial has not earned yet
 *  (an evaluation, a fit score history) start where a real day-one trial would. */
const contractFromDeal = (deal: Deal): Contract | null => {
  const c = deal.contract;
  if (!c) return null;
  const day = trialDay(c.started);
  const done = c.objectives.filter((o) => o.status === "complete").length;
  return {
    slug: deal.roleSlug,
    title: deal.title,
    company: deal.company,
    initials: deal.company.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase(),
    type: "trial",
    location: "Remote",
    line: `Started ${c.started} · ${day} · ${c.rate}`,
    status: c.ended ? { label: "Ended", tone: "neutral" } : { label: "On track", tone: "ok" },
    progressLabel: "Trial progress",
    progress: c.objectives.length ? Math.round((done / c.objectives.length) * 100) : 0,
    progressTone: "primary",
    manager: PAIR_MANAGER,
    managerFirst: PAIR_MANAGER.split(" ")[0],
    started: c.started,
    day,
    ends: c.ends,
    rate: c.rate,
    objectives: c.objectives.map((o) => ({
      id: o.id,
      title: o.title,
      kind: o.kind,
      progress: o.progress,
      status: o.status,
      meta: o.meta,
      current: o.current,
      target: o.target,
      unit: o.unit,
      dailyTarget: o.dailyTarget,
      due: c.ends,
      updated: o.updated,
    })),
    tfs: { overall: 0, performance: 0, profile: 0, workStyle: 0 },
    phase: 3,
    activity: c.activity,
    streak: c.streak,
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

export function DemoProvider({ children }: { children: ReactNode }) {
  const [saved, setSaved] = usePersisted("ind.saved", INITIAL_SAVED);
  const [applications, setApplications] = usePersisted("ind.applications", seedApps);
  const [withdrawnRoleSlugs, setWithdrawnRoleSlugs] = usePersisted<string[]>("ind.withdrawn", []);
  const [contracts, setContracts] = usePersisted("ind.contracts", seedContracts);
  const [doneTasks, setDoneTasks] = usePersisted<string[]>("ind.doneTasks", []);
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
  const transactions: Transaction[] = [
    ...live.payments.map((p) =>
      // A dispute ruled for the Team Builder sends escrow back to them: on the contract's history
      // (IN-032), never in this balance.
      p.kind === "refunded"
        ? { date: p.date, at: p.at, desc: `Refunded to ${p.company} after a dispute ruling · ${p.title}`, party: p.company, type: "Payment Refunded" as const, contract: p.contract, amount: p.amount, status: { label: "Refunded", tone: "neutral" as const } }
        : { date: p.date, at: p.at, desc: `Payment released · ${p.title}`, party: p.company, type: "Payment Released" as const, contract: p.contract, amount: `+${p.amount}`, status: { label: "Available", tone: "ok" as const } },
    ),
    ...withdrawals,
    ...seedTransactions,
  ];

  /**
   * IN-030 — ticking a task has to move the key result and the objective above it, so the tasks
   * are patched here and every percentage is computed from them rather than read from a seed.
   */
  const keyResults: KeyResult[] = KEY_RESULTS.map((kr) => {
    if (!kr.tasks) return kr;
    const tasks = kr.tasks.map((t) => ({ ...t, done: t.done || doneTasks.includes(`${kr.id}:${t.id}`) }));
    const patched = { ...kr, tasks };
    return krValue(patched) === 100 ? { ...patched, progress: 100, status: { label: "Achieved", tone: "ok" as const } } : patched;
  });

  /**
   * Released payments minus what has already been paid out. It used to be a stored number that
   * no transaction moved, so the balance and the ledger could disagree — and after the pair trim
   * it claimed money that no row explained.
   */
  const available = transactions.filter((t) => t.type === "Payment Released").reduce((n, t) => n + amountOf(t.amount), 0) - transactions.filter((t) => t.type === "Payout").reduce((n, t) => n + amountOf(t.amount), 0);

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

  const value: Demo = {
    saved,
    toggleSaved: (slug) => setSaved((s) => (s.includes(slug) ? s.filter((x) => x !== slug) : [...s, slug])),
    applications: allApplications,
    canChat,
    setStage: (id, stage, status, notify) => {
      const app = allApplications.find((x) => x.id === id);
      const kind = notify === undefined ? STAGE_MOVE[stage as keyof typeof STAGE_MOVE] : notify || undefined;
      if (kind && app) move(kind, { slug: app.roleSlug, title: app.title });
      // The shared engagement moves in the shared store, so the Team Builder's tracker moves with it.
      if (id === DEAL_ID) {
        updateDeal((d) => {
          // IN-070 — confirming is what the Team Builder's schedule reads as Confirmed.
          if (stage === "invite_accepted" && d.interview) return { ...d, stage, interview: { ...d.interview, accepted: true } };
          // IN-075 — a declined offer keeps its stage; the offer itself records the answer.
          if (notify === "offer_declined" && d.offer) return { ...d, stage, offer: { ...d.offer, status: "declined" } };
          if (stage !== "hired" || !d.offer) return { ...d, stage };
          // Accepting turns the offer's objectives into the trial both trackers now work from.
          return {
            ...d,
            stage,
            offer: { ...d.offer, status: "accepted" },
            contract: d.contract ?? {
              started: d.offer.start,
              ends: d.offer.end,
              rate: d.offer.rate,
              objectives: d.offer.objectives.map((o) => ({ ...o, progress: 0, status: "on" as const, meta: "No update yet" })),
              activity: [],
              streak: 0,
            },
          };
        });
        // IN-074 — the hire takes the role's seat; a full posting leaves the job board.
        if (stage === "hired" && app) fillPosting(app.roleSlug);
        return;
      }
      setApplications((a) => a.map((x) => (x.id === id ? { ...x, stage, status: status ?? x.status } : x)));
    },
    withdraw: (id) => {
      if (id === DEAL_ID) {
        const d = getDeal();
        if (d) {
          move("withdrawn", { slug: d.roleSlug, title: d.title });
          setWithdrawnRoleSlugs((slugs) => (slugs.includes(d.roleSlug) ? slugs : [...slugs, d.roleSlug]));
        }
        return clearDeal();
      }
      const app = allApplications.find((x) => x.id === id);
      if (app) {
        move("withdrawn", { slug: app.roleSlug, title: app.title });
        setWithdrawnRoleSlugs((slugs) => (slugs.includes(app.roleSlug) ? slugs : [...slugs, app.roleSlug]));
      }
      setApplications((a) => a.filter((x) => x.id !== id));
    },
    apply: (roleSlug, title, company, match) => {
      if (withdrawnRoleSlugs.includes(roleSlug) || allApplications.some((x) => x.roleSlug === roleSlug)) return; // IN-017: cannot apply twice
      move("applied", { slug: roleSlug, title });
      // IN-017 — applying starts the engagement the Team Builder sees in their candidate tracker.
      startDeal({ roleSlug, title, company, match, submitted: today() });
    },
    submitProposal: (id, proposal) => {
      const app = allApplications.find((x) => x.id === id);
      if (app) move("proposal_sent", { slug: app.roleSlug, title: app.title });
      if (id === DEAL_ID)
        return updateDeal((d) => ({
          ...d,
          stage: "proposal_sent",
          proposal: { ...proposal, version: (d.proposal?.version ?? 0) + 1, sent: today() },
          revision: undefined,
        }));
      setApplications((a) => a.map((x) => (x.id === id ? { ...x, stage: "proposal_sent", status: { label: "Proposal submitted", tone: "info" } } : x)));
    },
    withdrawnRoleSlugs,
    contracts: allContracts,
    setObjectives: (slug, fn) => {
      // An update on a shared contract is what the Team Builder reviews, so it goes to the deal.
      if (dealContract && slug === dealContract.slug) {
        return updateDeal((d) => {
          if (!d.contract) return d;
          const next = fn(dealContract.objectives);
          return { ...d, contract: { ...d.contract, objectives: d.contract.objectives.map((o) => { const u = next.find((x) => x.id === o.id); return u ? { ...o, progress: u.progress, status: u.status, meta: u.meta, current: u.current, updated: u.updated } : o; }) } };
        });
      }
      setContracts((cs) => cs.map((c) => (c.slug === slug ? { ...c, objectives: fn(c.objectives) } : c)));
    },
    keyResults,
    markTask: (krId, taskId) => setDoneTasks((t) => (t.includes(`${krId}:${taskId}`) ? t : [...t, `${krId}:${taskId}`])),
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
      const now = new Date();
      setWithdrawals((all) => [
        {
          date: now.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
          at: now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate(),
          desc: `Payout to ${method.brand} ····${method.last4}`,
          party: "—",
          type: "Payout" as const,
          amount: `−${available.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
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
