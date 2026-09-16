"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import type { Stage } from "@/components/independent/ui";
import { INITIAL_SAVED, applications as seedApps, notifications as seedNotifs, payoutMethods as seedPayouts } from "./data";
import type { Application, Notification, PayoutMethod } from "./data";

/**
 * In-memory demo state shared across pages, so a button on one screen is visible on another
 * (save a role → Saved roles; accept an invitation → pipeline; add a payout method → Wallet).
 * ponytail: plain useState in a context; swap for a real API client when one exists.
 */
type Demo = {
  saved: string[];
  toggleSaved: (slug: string) => void;
  applications: Application[];
  setStage: (id: string, stage: Stage, status?: Application["status"]) => void;
  withdraw: (id: string) => void;
  apply: (roleSlug: string, title: string, company: string, match: number) => void;
  withdrawnRoleSlugs: string[];
  payouts: PayoutMethod[];
  addPayout: (m: PayoutMethod) => void;
  removePayout: (id: string) => void;
  setDefaultPayout: (id: string) => void;
  notifications: Notification[];
  markRead: (id?: string) => void;
  available: number;
  withdrawFunds: () => void;
};

const Ctx = createContext<Demo | null>(null);

export function DemoProvider({ children }: { children: ReactNode }) {
  const [saved, setSaved] = useState<string[]>(INITIAL_SAVED);
  const [applications, setApplications] = useState<Application[]>(seedApps);
  const [withdrawnRoleSlugs, setWithdrawnRoleSlugs] = useState<string[]>([]);
  const [payouts, setPayouts] = useState<PayoutMethod[]>(seedPayouts);
  const [notifications, setNotifications] = useState<Notification[]>(seedNotifs);
  const [available, setAvailable] = useState(1400);

  const value: Demo = {
    saved,
    toggleSaved: (slug) => setSaved((s) => (s.includes(slug) ? s.filter((x) => x !== slug) : [...s, slug])),
    applications,
    setStage: (id, stage, status) => setApplications((a) => a.map((x) => (x.id === id ? { ...x, stage, status: status ?? x.status } : x))),
    withdraw: (id) => {
      const app = applications.find((x) => x.id === id);
      if (app) setWithdrawnRoleSlugs((slugs) => (slugs.includes(app.roleSlug) ? slugs : [...slugs, app.roleSlug]));
      setApplications((a) => a.filter((x) => x.id !== id));
    },
    apply: (roleSlug, title, company, match) => {
      if (withdrawnRoleSlugs.includes(roleSlug) || applications.some((x) => x.roleSlug === roleSlug)) return;
      setApplications((a) => [{ id: `new-${Date.now()}`, roleSlug, title, company, match, submitted: "Submitted just now", stage: "applied" }, ...a]);
    },
    withdrawnRoleSlugs,
    payouts,
    addPayout: (m) =>
      setPayouts((p) => {
        const canBeDefault = m.isDefault && m.verified.startsWith("Verified");
        const next = { ...m, isDefault: canBeDefault };
        return (canBeDefault ? p.map((x) => ({ ...x, isDefault: false })) : p).concat(next);
      }),
    removePayout: (id) => setPayouts((p) => p.filter((x) => x.id !== id)),
    setDefaultPayout: (id) => setPayouts((p) => p.map((x) => ({ ...x, isDefault: x.id === id && x.verified.startsWith("Verified") }))),
    notifications,
    markRead: (id) => setNotifications((n) => n.map((x) => (id === undefined || x.id === id ? { ...x, unread: false } : x))),
    available,
    withdrawFunds: () => setAvailable((amount) => (amount > 0 && payouts.some((p) => p.isDefault && p.verified.startsWith("Verified")) ? 0 : amount)),
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useDemo(): Demo {
  const v = useContext(Ctx);
  if (!v) throw new Error("useDemo must be used inside <DemoProvider>");
  return v;
}
