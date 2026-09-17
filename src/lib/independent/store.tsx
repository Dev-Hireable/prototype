"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { Stage } from "@/components/independent/ui";
import { markRead as markLiveRead, move, useLive, usePersisted } from "@/lib/demo/live";
import type { MoveKind } from "@/lib/demo/live";
import { KEY_RESULTS, krValue } from "@/lib/team/data";
import type { KeyResult } from "@/lib/team/data";
import { INITIAL_SAVED, applications as seedApps, contracts as seedContracts, disputes as seedDisputes, ME, payoutMethods as seedPayouts, profile as seedProfile, tagsFor, transactions as seedTransactions, WORK_STYLE_ANSWERS } from "./data";
import type { Application, Contract, Dispute, Notification, Objective, PayoutMethod, Transaction } from "./data";

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
  /**
   * `notify` overrides which notification fires: omitted infers it from the stage, `false` stays
   * silent, and a kind names it outright — declining an offer stays on the same stage, so
   * inference alone would say nothing at all.
   */
  setStage: (id: string, stage: Stage, status?: Application["status"], notify?: MoveKind | false) => void;
  withdraw: (id: string) => void;
  apply: (roleSlug: string, title: string, company: string, match: number) => void;
  withdrawnRoleSlugs: string[];
  /** IN-076 — progress updates have to survive a reload, so the contracts live here, not in page state. */
  contracts: Contract[];
  setObjectives: (slug: string, fn: (os: Objective[]) => Objective[]) => void;
  /** IN-030 — key results with the tasks this session has ticked applied, so progress is derived. */
  keyResults: KeyResult[];
  markTask: (krId: string, taskId: string) => void;
  /** IN-032 — one dispute per contract; the tab shows it and the File a Dispute button stands down. */
  disputes: Dispute[];
  fileDispute: (d: Dispute) => void;
  /** IN-082 — withdrawing leaves the dispute on file as Withdrawn; it never unblocks a re-file. */
  withdrawDispute: (id: string) => void;
  /** IN-051 / IN-052 / IN-053 — the seeded ledger plus anything recorded this session, newest first. */
  transactions: Transaction[];
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
  const [disputes, setDisputes] = usePersisted("ind.disputes", seedDisputes);
  const [profile, setProfile] = usePersisted<Profile>("ind.profile", SEED_PROFILE);
  const [workStyle, setWorkStyle] = usePersisted("ind.workStyle", WORK_STYLE_ANSWERS);
  const [payouts, setPayouts] = usePersisted("ind.payouts", seedPayouts);
  /** Withdrawals made in this session; they join the ledger like any other transaction. */
  const [withdrawals, setWithdrawals] = usePersisted<Transaction[]>("ind.withdrawals", []);
  const live = useLive();

  /**
   * IN-051 — a payment recorded on the other side of the demo has to show up here immediately,
   * so the ledger is the seed plus whatever the shared store has collected since, newest first.
   */
  const amountOf = (s: string) => Number(s.replace(/[^0-9.]/g, "")) || 0;
  const transactions: Transaction[] = [
    ...live.payments.map((p) => ({
      date: p.date,
      at: p.at,
      desc: `Payment released · ${p.title}`,
      party: p.company,
      type: "Payment Released" as const,
      contract: p.contract,
      amount: `+${p.amount}`,
      status: { label: "Available", tone: "ok" as const },
    })),
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

  const value: Demo = {
    saved,
    toggleSaved: (slug) => setSaved((s) => (s.includes(slug) ? s.filter((x) => x !== slug) : [...s, slug])),
    applications,
    setStage: (id, stage, status, notify) => {
      const app = applications.find((x) => x.id === id);
      const kind = notify === undefined ? STAGE_MOVE[stage as keyof typeof STAGE_MOVE] : notify || undefined;
      if (kind && app) move(kind, { slug: app.roleSlug, title: app.title });
      setApplications((a) => a.map((x) => (x.id === id ? { ...x, stage, status: status ?? x.status } : x)));
    },
    withdraw: (id) => {
      const app = applications.find((x) => x.id === id);
      if (app) {
        move("withdrawn", { slug: app.roleSlug, title: app.title });
        setWithdrawnRoleSlugs((slugs) => (slugs.includes(app.roleSlug) ? slugs : [...slugs, app.roleSlug]));
      }
      setApplications((a) => a.filter((x) => x.id !== id));
    },
    apply: (roleSlug, title, company, match) => {
      if (withdrawnRoleSlugs.includes(roleSlug) || applications.some((x) => x.roleSlug === roleSlug)) return; // IN-017: cannot apply twice
      move("applied", { slug: roleSlug, title });
      setApplications((a) => [{ id: `new-${Date.now()}`, roleSlug, title, company, match, submitted: "Submitted just now", stage: "applied" }, ...a]);
    },
    withdrawnRoleSlugs,
    contracts,
    setObjectives: (slug, fn) => setContracts((cs) => cs.map((c) => (c.slug === slug ? { ...c, objectives: fn(c.objectives) } : c))),
    keyResults,
    markTask: (krId, taskId) => setDoneTasks((t) => (t.includes(`${krId}:${taskId}`) ? t : [...t, `${krId}:${taskId}`])),
    disputes,
    fileDispute: (d) => setDisputes((all) => (all.some((x) => x.contract === d.contract) ? all : [d, ...all])),
    withdrawDispute: (id) => setDisputes((all) => all.map((d) => (d.id === id ? { ...d, status: { label: "Withdrawn", tone: "neutral" as const } } : d))),
    transactions,
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
