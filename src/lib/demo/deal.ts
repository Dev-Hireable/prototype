"use client";

import { useSyncExternalStore } from "react";
import type { Stage } from "@/components/independent/ui";

/**
 * The one engagement the demo is about, held where both portals can see it.
 *
 * The prototype has exactly one Team Builder and one Independent, and the thing they are doing
 * together — an application that becomes an interview, an offer, then a trial — was previously two
 * unconnected copies: the client had `candidates`, the talent had `applications`, and neither
 * moved when the other side acted. Starting from an empty demo that breaks immediately: the talent
 * applies and the client's tracker stays empty.
 *
 * So the deal lives here. Each store still exposes its own shape (Candidate, Application,
 * Contract) — it derives them from this one record, and writes back through these actions.
 * ponytail: a single deal, not a table. One pair, one role; widen it when a second pair exists.
 */

export type DealObjective = { id: string; title: string; kind: "kpi" | "okr" | "task"; target?: number; unit?: string; dailyTarget?: number };

/**
 * IN-072 / IN-073 — the proposal exactly as the talent submitted it. The Team Builder reviews
 * this record and the offer is built from it, so the rate and objectives signed are the ones
 * proposed. `version` counts resubmissions after a revision request.
 */
export type DealProposal = { version: number; sent: string; rate: string; letter: string; portfolio?: string; objectives: { title: string; kind: DealObjective["kind"] }[] };

export type Deal = {
  roleSlug: string;
  title: string;
  company: string;
  match: number;
  /** Where the pipeline has got to — the same vocabulary both portals already use. */
  stage: Stage;
  submitted: string;
  dropped?: boolean;
  /** TB-037 / IN-070 — set when the Team Builder books one; `accepted` once the talent confirms. */
  interview?: { when: string; format: string; link?: string; accepted?: boolean; past?: boolean };
  /** IN-072 — what the talent proposed; absent until they submit. */
  proposal?: DealProposal;
  /** TB-106 — the Team Builder's requested changes; cleared when the talent resubmits. */
  revision?: { note: string; date: string };
  /** TB-105 / IN-074 — the terms the trial starts on. */
  offer?: { rate: string; start: string; end: string; objectives: DealObjective[]; status: "sent" | "accepted" | "declined"; sent: string };
  /** Created when the offer is accepted: from then on both trackers read this. */
  contract?: {
    started: string;
    ends: string;
    rate: string;
    /** Progress on each objective, shared so an update on one side is a review on the other. */
    objectives: (DealObjective & { progress: number; status: "on" | "pending" | "complete" | "risk" | "revision"; meta: string; current?: number; updated?: string })[];
    /** One tile per weekday since the trial started (TB-058): 0 nothing, 1 some, 2 all. */
    activity: number[];
    streak: number;
    /** Set once the Team Builder submits their evaluation (TB-067 / IN-034). */
    evaluation?: { stars: number; feedback: string; recommendation: string; date: string };
    ended?: boolean;
  };
};

/**
 * A role the Team Builder has published. It lives here rather than in their own store because the
 * talent's job board is the other half of it: with nothing seeded, a posting is the only way a
 * role exists at all.
 */
export type Posting = {
  slug: string;
  title: string;
  type: "trial" | "full-time";
  company: string;
  companyBlurb: string;
  location: string;
  industry: string;
  size: string;
  rate: string;
  rateRange: string;
  level: string;
  description: string[];
  skills: string[];
  objectives: string[];
  expectation: string;
  /** Optional so postings saved before these fields existed still load. */
  attachment?: string;
  duration?: string;
  /** Seats to fill ("How many to hire"); missing means one. */
  hires?: number;
  /**
   * Set when the last seat is hired. The posting stays on file so the hired talent's application
   * still has its job details, but it leaves the board and can't be applied to.
   */
  filled?: boolean;
  posted: string;
  closes: string;
  /** The company's own work style, so the talent's match is worked out against something real. */
  workStyle: number[];
};

/**
 * TB-018 — at or above this, an application is a match: the Team Builder's tracker files it
 * under Matched rather than Candidates, on both sides and for records made before the rule.
 */
export const MATCH_THRESHOLD = 80;

/** The stage to show for a deal — a strong enough application reads as a match. */
export const stageOf = (deal: Deal): Stage => (deal.stage === "applied" && deal.match >= MATCH_THRESHOLD ? "matched" : deal.stage);

/** The stages from which there is a thread: an interview is on the table. */
const CHATTABLE: Stage[] = ["invited", "invite_accepted", "interviewed", "proposal_requested", "proposal_sent", "offer_received", "offer_accepted", "hired"];

/**
 * IN-006 — the talent can only message a company once it has invited them to interview. Before
 * that there is no thread to open, on either side.
 */
export const canMessage = (deal: Deal | null) => !!deal && CHATTABLE.includes(stageOf(deal));

type State = { deal: Deal | null; postings: Posting[] };

const KEY = "hireable.demo.deal";
const EMPTY: State = { deal: null, postings: [] };

let snapshot: State = EMPTY;
let loaded = false;
const subscribers = new Set<() => void>();
const emit = () => {
  for (const fn of subscribers) fn();
};

function ensureLoaded() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = localStorage.getItem(KEY);
    const saved = raw ? (JSON.parse(raw) as Partial<State>) : null;
    snapshot = saved ? { deal: saved.deal ?? null, postings: saved.postings ?? [] } : EMPTY;
  } catch {
    snapshot = EMPTY;
  }
}

function write(next: State) {
  snapshot = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* private mode — the demo still works for this tab */
  }
  emit();
}

function subscribe(fn: () => void) {
  if (!loaded) {
    ensureLoaded();
    emit();
  }
  subscribers.add(fn);
  const onStorage = (e: StorageEvent) => {
    if (e.key !== KEY) return;
    try {
      const saved = e.newValue ? (JSON.parse(e.newValue) as Partial<State>) : null;
      snapshot = saved ? { deal: saved.deal ?? null, postings: saved.postings ?? [] } : EMPTY;
    } catch {
      snapshot = EMPTY;
    }
    emit();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    subscribers.delete(fn);
    window.removeEventListener("storage", onStorage);
  };
}

/** The deal as both portals see it — re-renders on either side's move, across tabs. */
export function useDeal(): Deal | null {
  return useSyncExternalStore(
    subscribe,
    () => snapshot.deal,
    () => null,
  );
}

export function getDeal(): Deal | null {
  ensureLoaded();
  return snapshot.deal;
}

/** Every published role, newest first — this is the talent's job board. */
export function usePostings(): Posting[] {
  return useSyncExternalStore(
    subscribe,
    () => snapshot.postings,
    () => EMPTY.postings,
  );
}

/** TB-026 — publishing puts the role in front of the talent. */
export function publishPosting(posting: Posting) {
  ensureLoaded();
  write({ ...snapshot, postings: [posting, ...snapshot.postings.filter((p) => p.slug !== posting.slug)] });
}

/**
 * A hire takes one seat. With one live pair in the demo, a single-seat posting is full after one
 * hire; a multi-seat one stays open for the rest.
 */
export function fillPosting(slug: string) {
  ensureLoaded();
  const posting = snapshot.postings.find((p) => p.slug === slug);
  if (!posting || (posting.hires ?? 1) > 1) return;
  write({ ...snapshot, postings: snapshot.postings.map((p) => (p.slug === slug ? { ...p, filled: true } : p)) });
}

/** A role that is closed, archived or deleted comes off the board. */
export function unpublishPosting(slug: string) {
  ensureLoaded();
  write({ ...snapshot, postings: snapshot.postings.filter((p) => p.slug !== slug) });
}

/** IN-017 — applying is what starts the deal; there is nothing before it. */
export function startDeal(deal: Omit<Deal, "stage" | "submitted"> & Partial<Pick<Deal, "stage" | "submitted">>) {
  ensureLoaded();
  write({ ...snapshot, deal: { stage: "applied", submitted: today(), ...deal } });
}

export function updateDeal(patch: (deal: Deal) => Deal) {
  ensureLoaded();
  if (!snapshot.deal) return;
  write({ ...snapshot, deal: patch(snapshot.deal) });
}

export function clearDeal() {
  ensureLoaded();
  write({ ...snapshot, deal: null });
}

/**
 * True once the browser has taken over. Everything in this demo lives in localStorage, so the
 * server and the first client render see nothing: a page that looks a record up would 404 on a
 * refresh before the store had loaded. Screens gate on this instead of guessing.
 */
export function useHydrated() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

/** "12 Aug 2026" — the demo's date format, used wherever a record is created live. */
export const today = () => new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

/** Day N of 30 for a trial that started on `started`, so the countdown is the real one. */
export function trialDay(started: string, days = 30) {
  const from = Date.parse(started);
  const elapsed = Number.isNaN(from) ? 1 : Math.floor((Date.now() - from) / 86400000) + 1;
  return `Day ${Math.min(Math.max(elapsed, 1), days)} of ${days}`;
}
