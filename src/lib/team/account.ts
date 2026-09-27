"use client";

import { persisted, useStored } from "@/lib/demo/live";
import { COMPANY_FIELDS, COMPANY_PROFILE, MARKETING_BANNER, TEAM_PROFILE, paymentMethods as seedCards } from "./data";
import type { CompanyProfile, PaymentMethod, TeamProfile } from "./data";

/*
 * The Team Builder's own account: who they are, their company, their work-style answers and the
 * cards that fund escrow. Kept in this browser (persisted in @/lib/demo/live).
 */

export const profileStore = persisted("team.profile", TEAM_PROFILE);
export const companyStore = persisted("team.company", COMPANY_PROFILE);
/** OB-002 / TB-096 — the quiz's answers: sign-up seeds them, a retake replaces them (@/lib/demo/work-style). */
const workStyleStore = persisted<number[]>("team.workStyle", []);
const cardsStore = persisted("team.cards", seedCards);

const setProfile = (patch: Partial<TeamProfile>) => profileStore.set((x) => ({ ...x, ...patch }));
const setCompany = (patch: Partial<CompanyProfile>) => companyStore.set((x) => ({ ...x, ...patch }));

/** TB-094 / TB-097 — the profile pages write here; the shell and the dashboard read it. TB-096 — the company's work-style badges come from `workStyle`. */
export function useTeamAccount() {
  const profile = useStored(profileStore);
  const company = useStored(companyStore);
  const workStyle = useStored(workStyleStore);
  return { profile, setProfile, company, setCompany, workStyle };
}

const addCard = (c: PaymentMethod) => cardsStore.set((cs) => (c.isDefault ? cs.map((x) => ({ ...x, isDefault: false })) : cs).concat(c));
const removeCard = (id: string) =>
  cardsStore.set((cs) => {
    const next = cs.filter((c) => c.id !== id);
    return next.some((c) => c.isDefault) ? next : next.map((c, i) => ({ ...c, isDefault: i === 0 }));
  });
const setDefaultCard = (id: string) => cardsStore.set((cs) => cs.map((c) => ({ ...c, isDefault: c.id === id })));

export function useCards() {
  return { cards: useStored(cardsStore), addCard, removeCard, setDefaultCard };
}

/**
 * TB-001 — the checklist locks "Create your first role" until the company profile is complete and a
 * card can fund the escrow; publishing honours the same lock (drafts are always fine).
 */
const publishable = (company: CompanyProfile, cards: PaymentMethod[]) => COMPANY_FIELDS.every((k) => String(company[k]).trim() !== "") && cards.length > 0;

/** The lock as it stands now, for an action. */
export const canPublishNow = () => publishable(companyStore.get(), cardsStore.get());

export function useCanPublish() {
  return publishable(useStored(companyStore), useStored(cardsStore));
}

/** The id of the dashboard banner last closed; a new banner shows again. */
const bannerDismissedStore = persisted("team.bannerDismissed", "");

/** Whether the dashboard's current banner was closed, and closing it. */
export function useTeamBanner() {
  const dismissed = useStored(bannerDismissedStore) === MARKETING_BANNER.id;
  return { dismissed, dismiss: () => bannerDismissedStore.set(MARKETING_BANNER.id) };
}
