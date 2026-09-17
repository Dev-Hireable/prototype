"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { Stage } from "@/components/independent/ui";
import { markRead as markLiveRead, move, PAIR, useLive, usePersisted } from "@/lib/demo/live";
import type { MoveKind } from "@/lib/demo/live";
import { COMPANY_PROFILE, INITIAL_SAVED, TEAM_PROFILE, candidates as seedCandidates, contracts as seedContracts, disputes as seedDisputes, interviews as seedInterviews, offers as seedOffers, paymentMethods as seedCards, roles as seedRoles } from "./data";
import type { Candidate, CompanyProfile, Contract, Dispute, Evaluation, Interview, Notification, Objective, Offer, PaymentMethod, Role, RoleStatus, TeamProfile } from "./data";

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
  /**
   * `notify` overrides which notification fires: omitted infers it from the stage, `false`
   * stays silent, and a kind names it outright — a revision request and a first request both
   * land on the same stage, so inference alone would send the wrong one (and send it twice).
   */
  setStage: (id: string, stage: Stage, status?: Candidate["status"], notify?: MoveKind | false) => void;
  setDropped: (id: string, dropped: boolean) => void;
  invite: (independent: string, role: string) => void;
  /**
   * TB-040 — scheduling an interview from a candidate's profile has to produce a row on the
   * Interviews page and the dashboard widget, and a reschedule or cancel has to stick.
   */
  interviews: Interview[];
  addInterview: (i: Interview) => void;
  setInterview: (id: string, patch: Partial<Interview>) => void;
  contracts: Contract[];
  /** TB-071 — close the engagement and release escrow. */
  endContract: (slug: string) => void;
  /** TB-075/109 — objectives live on the contract, so creates and verdicts survive a reload. */
  setObjectives: (slug: string, fn: (os: Objective[]) => Objective[]) => void;
  /**
   * TB-067 — record the evaluation so End Contract and Hire for Full-Time unlock. A list, not a
   * single entry: TB-117 lets a full-time contract be evaluated repeatedly, and TB-081 wants the
   * whole history. Newest first.
   */
  evaluations: Record<string, Evaluation[]>;
  addEvaluation: (slug: string, e: Omit<Evaluation, "date">) => void;
  disputes: Dispute[];
  addDispute: (d: Dispute) => void;
  /** TB-118 — withdrawing has to stick, so it goes through the store like filing does. */
  setDispute: (id: string, patch: Partial<Dispute>) => void;
  offers: Offer[];
  addOffer: (o: Offer) => void;
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
  const [disputes, setDisputes] = usePersisted("team.disputes", seedDisputes);
  const [interviews, setInterviews] = usePersisted("team.interviews", seedInterviews);
  const [evaluations, setEvaluations] = usePersisted<Record<string, Evaluation[]>>("team.evaluations", {});
  const [profile, setProfileState] = usePersisted("team.profile", TEAM_PROFILE);
  const [company, setCompanyState] = usePersisted("team.company", COMPANY_PROFILE);
  /** OB-002 — tags generated by the sign-up quiz, handed over before this store mounts. */
  const [signupTags] = usePersisted<string[] | null>("team.companyTags", null);
  const live = useLive();

  /** Only the live pair emits notifications — everyone else is static background data. */
  const roleOf = (slug: string) => ({ slug, title: roles.find((r) => r.slug === slug)?.title ?? slug });
  const livePair = (c: Candidate | undefined) => c && c.independent === PAIR.independent.slug;

  const value: Demo = {
    saved,
    toggleSaved: (slug) => setSaved((s) => (s.includes(slug) ? s.filter((x) => x !== slug) : [...s, slug])), // TB-018 / TB-022: silent, no notification
    roles,
    addRole: (r) => setRoles((rs) => [r, ...rs.filter((x) => x.slug !== r.slug)]),
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
    setRoleStatus: (slug, status) => setRoles((rs) => rs.map((r) => (r.slug === slug ? { ...r, status } : r))),
    removeRole: (slug) => setRoles((rs) => rs.filter((r) => r.slug !== slug)),
    candidates,
    setStage: (id, stage, status, notify) => {
      const c = candidates.find((x) => x.id === id);
      const kind = notify === undefined ? STAGE_MOVE[stage as keyof typeof STAGE_MOVE] : notify || undefined;
      if (kind && livePair(c)) move(kind, roleOf(c!.role));
      setCandidates((cs) => cs.map((x) => (x.id === id ? { ...x, stage, status } : x)));
    },
    setDropped: (id, dropped) => setCandidates((cs) => cs.map((c) => (c.id === id ? { ...c, dropped } : c))), // TB-044: not notified
    invite: (independent, role) => {
      if (candidates.some((c) => c.independent === independent && c.role === role)) return;
      if (independent === PAIR.independent.slug) move("invite", roleOf(role));
      setCandidates((cs) => [{ id: `c${Date.now()}`, independent, role, stage: "matched", status: { label: "Invited to apply", tone: "info" }, submitted: "Invited just now" }, ...cs]);
    },
    interviews,
    addInterview: (i) => setInterviews((is) => [i, ...is]),
    setInterview: (id, patch) => setInterviews((is) => is.map((i) => (i.id === id ? { ...i, ...patch } : i))),
    contracts,
    setObjectives: (slug, fn) => setContracts((cs) => cs.map((c) => (c.slug === slug ? { ...c, objectives: fn(c.objectives) } : c))),
    endContract: (slug) => setContracts((cs) => cs.map((c) => (c.slug === slug ? { ...c, status: { label: "Ended", tone: "neutral" as const }, progressLabel: "Contract complete" } : c))),
    evaluations,
    addEvaluation: (slug, e) => setEvaluations((all) => ({ ...all, [slug]: [{ ...e, date: "Today" }, ...(all[slug] ?? [])] })),
    disputes,
    addDispute: (d) => setDisputes((ds) => [d, ...ds]),
    setDispute: (id, patch) => setDisputes((ds) => ds.map((d) => (d.id === id ? { ...d, ...patch } : d))),
    offers,
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
