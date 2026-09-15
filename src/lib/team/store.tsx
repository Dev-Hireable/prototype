"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import type { Stage } from "@/components/independent/ui";
import { INITIAL_SAVED, candidates as seedCandidates, notifications as seedNotifs, offers as seedOffers, paymentMethods as seedCards, roles as seedRoles } from "./data";
import type { Candidate, Notification, Offer, PaymentMethod, Role, RoleStatus } from "./data";

/**
 * In-memory demo state shared across the Team Builder pages (save an independent → Saved list;
 * invite → candidate stage; publish a role → All roles; add a card → Settings).
 * ponytail: plain useState in a context; swap for a real API client when one exists.
 */
type Demo = {
  saved: string[];
  toggleSaved: (slug: string) => void;
  roles: Role[];
  addRole: (r: Role) => void;
  setRoleStatus: (slug: string, status: RoleStatus) => void;
  removeRole: (slug: string) => void;
  candidates: Candidate[];
  setStage: (id: string, stage: Stage, status?: Candidate["status"]) => void;
  setDropped: (id: string, dropped: boolean) => void;
  invite: (independent: string, role: string) => void;
  offers: Offer[];
  setOffer: (id: string, patch: Partial<Offer>) => void;
  cards: PaymentMethod[];
  addCard: (c: PaymentMethod) => void;
  removeCard: (id: string) => void;
  setDefaultCard: (id: string) => void;
  notifications: Notification[];
  markRead: (id?: string) => void;
};

const Ctx = createContext<Demo | null>(null);

export function DemoProvider({ children }: { children: ReactNode }) {
  const [saved, setSaved] = useState<string[]>(INITIAL_SAVED);
  const [roles, setRoles] = useState<Role[]>(seedRoles);
  const [candidates, setCandidates] = useState<Candidate[]>(seedCandidates);
  const [offers, setOffers] = useState<Offer[]>(seedOffers);
  const [cards, setCards] = useState<PaymentMethod[]>(seedCards);
  const [notifications, setNotifications] = useState<Notification[]>(seedNotifs);

  const value: Demo = {
    saved,
    toggleSaved: (slug) => setSaved((s) => (s.includes(slug) ? s.filter((x) => x !== slug) : [...s, slug])),
    roles,
    addRole: (r) => setRoles((rs) => [r, ...rs.filter((x) => x.slug !== r.slug)]),
    setRoleStatus: (slug, status) => setRoles((rs) => rs.map((r) => (r.slug === slug ? { ...r, status } : r))),
    removeRole: (slug) => setRoles((rs) => rs.filter((r) => r.slug !== slug)),
    candidates,
    setStage: (id, stage, status) => setCandidates((cs) => cs.map((c) => (c.id === id ? { ...c, stage, status } : c))),
    setDropped: (id, dropped) => setCandidates((cs) => cs.map((c) => (c.id === id ? { ...c, dropped } : c))),
    invite: (independent, role) =>
      setCandidates((cs) =>
        cs.some((c) => c.independent === independent && c.role === role)
          ? cs
          : [{ id: `c${Date.now()}`, independent, role, stage: "matched", status: { label: "Invited to apply", tone: "info" }, submitted: "Invited just now" }, ...cs],
      ),
    offers,
    setOffer: (id, patch) => setOffers((os) => os.map((o) => (o.id === id ? { ...o, ...patch } : o))),
    cards,
    addCard: (c) => setCards((cs) => (c.isDefault ? cs.map((x) => ({ ...x, isDefault: false })) : cs).concat(c)),
    removeCard: (id) =>
      setCards((cs) => {
        const next = cs.filter((c) => c.id !== id);
        return next.some((c) => c.isDefault) ? next : next.map((c, i) => ({ ...c, isDefault: i === 0 }));
      }),
    setDefaultCard: (id) => setCards((cs) => cs.map((c) => ({ ...c, isDefault: c.id === id }))),
    notifications,
    markRead: (id) => setNotifications((ns) => ns.map((n) => (id === undefined || n.id === id ? { ...n, unread: false } : n))),
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useDemo(): Demo {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useDemo must be used inside <DemoProvider>");
  return ctx;
}
