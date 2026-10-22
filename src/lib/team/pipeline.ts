"use client";

import { useMemo } from "react";
import { dayLabel, isPast, JOIN_OPENS_MINUTES, MONTHS, momentLabel, slotOffset, today } from "@/lib/portal/dates";
import { canMessage, contractTypeOf, lifecycleOfDeal, readDeal, recordInvite, stageOf, startDeal, trialStateOf, updateDeal, useDeal, withProposalEvent } from "@/lib/demo/deal";
import type { Deal } from "@/lib/demo/deal";
import { JOB_TYPE_LABEL } from "@/lib/contract/job-types";
import { savedOffset } from "@/lib/demo/clocks";
import { logStep, move, PAIR, persisted, proposalSource, useStored } from "@/lib/demo/live";
import { awaitsApplication, byName, INTERVIEW_CANCELLED, INTERVIEW_DECLINED, INTERVIEW_MISSED, NEW_TIME_REQUESTED, needsNewSlot, candidates as seedCandidates, interviews as seedInterviews } from "./data";
import type { Candidate, Interview } from "./data";
import { DEAL_ID } from "./deal-view";
import { bothClocks, slotAt } from "@/lib/portal/timezones";
import { roleOf } from "./roles";

/*
 * The candidate tracker and the interviews booked from it. The live pair's card and interview come
 * off the shared engagement (@/lib/demo/deal), the same record the talent's portal reads, so an
 * application or an accepted interview shows up here without a seed; everyone else is seed data.
 */

const candidatesStore = persisted("team.candidates", seedCandidates);
/** Dropped applications taken off this tracker, by application (deleteCandidate). */
const removedStore = persisted<string[]>("team.removedCandidates", []);
const interviewsStore = persisted("team.interviews", seedInterviews);

/**
 * A trial that has closed — end date reached, every trial task done, or ended early — and wasn't
 * converted. Its card leaves Hired for the Trial Ended column; a conversion puts it back in Hired.
 */
const trialClosed = (deal: Deal) => deal.stage === "hired" && contractTypeOf(deal) === "trial" && !!deal.contract && trialStateOf(deal.contract).over;

/** The Team Builder's clock, minutes off UTC: their profile's time zone, or this device's. A slot they pick is in it. */
export const teamOffset = () => savedOffset("team");

/**
 * #312 — an interview slot as the Team Builder reads it, with the talent's own clock beside it:
 * "Tue 29 Sep, 10:00 AM your time · 10:00 PM Juan's time". `offset` is the clock it was picked in;
 * a slot saved without one reads as it always did (slotOffset).
 */
export function slotForTeam(when: string, offset: number | undefined, independent: string) {
  return bothClocks(when, slotOffset(when, offset), teamOffset(), { offset: savedOffset("independent"), first: byName(independent).name.split(" ")[0] });
}

/**
 * #321 — when Join call opens, JOIN_OPENS_MINUTES before the start, in the Team Builder's clock:
 * "at 9:50 AM" on the day itself, "on Tue 29 Sep at 9:50 AM" before it.
 */
export function joinOpensAt(when: string, offset?: number, now = Date.now()) {
  const mine = teamOffset();
  // The slot read in a clock that many minutes behind the Team Builder's: their time, that much earlier.
  const at = slotAt(when, slotOffset(when, offset), mine - JOIN_OPENS_MINUTES);
  if (!at) return undefined;
  const [day, time] = at.split(", ");
  const here = new Date(now + mine * 60_000);
  return day.endsWith(` ${here.getUTCDate()} ${MONTHS[here.getUTCMonth()]}`) ? `at ${time}` : `on ${day} at ${time}`;
}

/** The live interview's slot, or the one the talent asked for, as the Team Builder reads it. */
const liveSlot = (slot: { when: string; offset?: number } | undefined) => slot && slotForTeam(slot.when, slot.offset, PAIR.independent.slug);

/** #327 — a hire's status: a trial with its end date ("Trial started", "Ends 30 Oct 2026"), a role with its first day. */
function hiredStatus(deal: Deal): Candidate["status"] {
  const type = contractTypeOf(deal);
  const started = deal.contract?.started;
  if (type !== "trial") return deal.contract?.ended ? { label: "Contract ended", tone: "neutral" } : { label: `Hired · ${JOB_TYPE_LABEL[type].toLowerCase()}`, tone: "ok", meta: started && `${isPast(started) ? "Started" : "Starts"} ${dayLabel(started)}` };
  const c = deal.conversion;
  if (c?.status === "sent" && !lifecycleOfDeal(deal)?.expired) return { label: `${JOB_TYPE_LABEL[c.type]} offer sent`, tone: "warn", meta: `Sent ${c.sent}` };
  if (c?.status === "declined") return { label: `${JOB_TYPE_LABEL[c.type]} offer declined`, tone: "danger" };
  // TB-072 — not answered by its start date: back to the decision.
  if (c?.status === "expired" || (c?.status === "sent" && lifecycleOfDeal(deal)?.expired)) return { label: `${JOB_TYPE_LABEL[c.type]} offer expired`, tone: "warn" };
  if (trialClosed(deal)) return { label: "Trial ended", tone: "neutral" };
  // "Hired" is for a full-time or part-time hire: an accepted trial offer has started a trial.
  const ends = deal.contract?.ends ? `Ends ${dayLabel(deal.contract.ends)}` : undefined;
  return started && !isPast(started) ? { label: `Trial starts ${dayLabel(started)}`, tone: "info", meta: ends } : { label: "Trial started", tone: "ok", meta: ends };
}

/** The Team Builder's status line for the deal, most advanced fact first. */
function dealStatus(deal: Deal): Candidate["status"] {
  if (deal.stage === "hired") return hiredStatus(deal);
  if (deal.proposalDeclined) return { label: "Proposal declined", tone: "danger", meta: deal.proposalDeclined.date };
  if (deal.offer?.status === "declined") return { label: "Offer declined", tone: "danger", meta: deal.offer.declineReason };
  if (deal.offer?.status === "withdrawn") return { label: "Offer withdrawn", tone: "neutral" };
  if (deal.offer?.status === "sent") return { label: "Offer sent", tone: "warn", meta: `Starts ${dayLabel(deal.offer.start)}` };
  if (deal.revision) return { label: "Revision requested", tone: "warn", meta: deal.revision.date };
  if (deal.stage === "proposal_sent" && deal.proposal) return { label: "Proposal submitted", tone: "info", meta: `v${deal.proposal.version} · ${deal.proposal.sent}` };
  if (deal.stage === "proposal_requested") return { label: "Awaiting proposal", tone: "warn" };
  const iv = deal.interview;
  const at = liveSlot(iv);
  if (deal.stage === "interviewed") return { label: "Interview completed", tone: "ok", meta: at };
  if (iv?.outcome === "declined") return { label: INTERVIEW_DECLINED, tone: "danger", meta: at };
  if (iv?.outcome === "cancelled") return { label: iv.missed ? INTERVIEW_MISSED : INTERVIEW_CANCELLED, tone: "neutral", meta: at };
  if (iv?.outcome === "reschedule") return { label: NEW_TIME_REQUESTED, tone: "warn", meta: liveSlot(iv.requested) };
  if (iv?.accepted) return { label: "Interview confirmed", tone: "ok", meta: at };
  if (iv) return { label: "Awaiting reply", tone: "neutral", meta: at };
  return { label: "New application", tone: "info" };
}

/** An interview's status pill in the Team Builder's lists, from where it has got to. */
const INTERVIEW_STATUS: Record<"awaiting" | "accepted" | "done" | "declined" | "cancelled" | "reschedule", Interview["status"]> = {
  awaiting: { label: "Awaiting reply", tone: "neutral" },
  accepted: { label: "Confirmed", tone: "ok" },
  done: { label: "Completed", tone: "ok" },
  declined: { label: "Declined", tone: "danger" },
  cancelled: { label: "Cancelled", tone: "neutral" },
  reschedule: { label: "New time asked", tone: "warn" },
};

/** The live application, as deleteCandidate keys it: this application, not the pair for good. */
const dealKey = (deal: Deal) => `deal:${deal.roleSlug}:${deal.submitted}`;

/** The tracker's cards: the live pair's first, then the seed's. */
function cardsOf(deal: Deal | null, candidates: Candidate[], removed: string[]): Candidate[] {
  const card: Candidate | null = deal
    ? {
        id: DEAL_ID,
        independent: PAIR.independent.slug,
        role: deal.roleSlug,
        stage: stageOf(deal),
        status: dealStatus(deal),
        submitted: `${deal.invited ? "Invited" : "Applied"} ${deal.submitted}`,
        dropped: deal.dropped,
        trialEnded: trialClosed(deal),
        hiredAs: deal.stage === "hired" ? contractTypeOf(deal) : undefined,
        autoDone: (deal.stage === "interviewed" && deal.interview?.auto) || undefined,
      }
    : null;
  // Once the pair applies, the deal is their card for that role; the "Invited to apply" row it
  // grew out of would otherwise sit beside it as a second copy of the same person. Only a card
  // that's showing stands in for the pair: once a dropped one is deleted, an invite to apply
  // again shows as its own card.
  const shown = card && deal && !(card.dropped && removed.includes(dealKey(deal))) ? card : null;
  return shown ? [shown, ...candidates.filter((c) => !(c.independent === shown.independent && c.role === shown.role))] : candidates;
}

function interviewsOf(deal: Deal | null, interviews: Interview[]): Interview[] {
  if (!deal?.interview) return interviews;
  const live: Interview = {
    id: DEAL_ID,
    independent: PAIR.independent.slug,
    role: deal.title,
    roleSlug: deal.roleSlug,
    candidate: DEAL_ID,
    when: deal.interview.when,
    offset: deal.interview.offset,
    by: deal.interview.by,
    format: deal.interview.format,
    link: deal.interview.link,
    status: INTERVIEW_STATUS[deal.interview.outcome ?? (deal.interview.accepted ? "accepted" : "awaiting")],
    past: deal.interview.past,
    auto: deal.interview.auto,
  };
  return [live, ...interviews];
}

/** The tracker and the interview list as they stand now, for an action. */
const cardsNow = () => cardsOf(readDeal(), candidatesStore.get(), removedStore.get());
const interviewsNow = () => interviewsOf(readDeal(), interviewsStore.get());

/** Only the live pair emits notifications — everyone else is static background data. */
const livePair = (c: Candidate) => c.independent === PAIR.independent.slug;

/** TB-103 — the request, with the note the talent reads beside it. */
function requestProposal(id: string, note?: string) {
  const c = cardsNow().find((x) => x.id === id);
  // Only after an interview that was held — never on one declined, cancelled or still to happen.
  if (!c || c.stage !== "interviewed") return;
  if (livePair(c)) move("proposal_requested", roleOf(c.role));
  if (id === DEAL_ID) return updateDeal((d) => ({ ...d, stage: "proposal_requested", proposalRequest: { note: note?.trim() || undefined, date: today() } }));
  candidatesStore.set((cs) => cs.map((x) => (x.id === id ? { ...x, stage: "proposal_requested", status: { label: "Awaiting proposal", tone: "warn", meta: "Sent today" } } : x)));
}

/** TB-106 — sends the proposal back with the note the talent revises against. */
function requestRevision(id: string, note: string) {
  const c = cardsNow().find((x) => x.id === id);
  // The note follows the step in the thread as Alex's message, linked to the proposal it asks to change.
  if (c && livePair(c)) move("proposal_revision", roleOf(c.role), { message: note, source: proposalSource(readDeal()) });
  if (id === DEAL_ID) return updateDeal((d) => ({ ...withProposalEvent(d, { kind: "revision", at: momentLabel(), note }), stage: "proposal_requested", revision: { note, date: today() } }));
  candidatesStore.set((cs) => cs.map((x) => (x.id === id ? { ...x, stage: "proposal_requested", status: { label: "Revision requested", tone: "warn", meta: "v1 · today" } } : x)));
}

/** TB-107 — the talent is told, with the reason; the card moves to Dropped. */
function declineProposal(id: string, reason?: string) {
  const c = cardsNow().find((x) => x.id === id);
  if (!c) return;
  if (livePair(c)) move("proposal_declined", roleOf(c.role));
  // TB-107: a declined proposal belongs in Dropped, and the talent's own card has to say so.
  if (id === DEAL_ID) return updateDeal((d) => ({ ...withProposalEvent(d, { kind: "declined", at: momentLabel(), reason: reason?.trim() || undefined }), dropped: true, proposalDeclined: { reason: reason?.trim() || undefined, date: today() } }));
  candidatesStore.set((cs) => cs.map((x) => (x.id === id ? { ...x, dropped: true, status: { label: "Proposal declined", tone: "danger" } } : x)));
}

/**
 * TB-044 — decline a candidate, or restore them to the stage they were at (a declined proposal is
 * back in review). Neither notifies the talent, but the live pair's step is logged in the thread
 * both sides read (#304), as the application on their side says it's closed.
 */
function setDropped(id: string, dropped: boolean) {
  if (id === DEAL_ID) {
    const deal = readDeal();
    if (deal) logStep(`${PAIR.team.company} ${dropped ? "declined" : "restored"} the ${deal.title} application`, { team: `/team/hire/roles/${deal.roleSlug}/candidates/${DEAL_ID}`, independent: `/independent/jobs/applications/${DEAL_ID}` });
    return updateDeal((d) => ({ ...d, dropped, proposalDeclined: dropped ? d.proposalDeclined : undefined }));
  }
  candidatesStore.set((cs) => cs.map((c) => (c.id === id ? { ...c, dropped } : c)));
}

/**
 * Takes a dropped candidate off the tracker for good, so the Dropped column doesn't pile up. The
 * live pair's card is their application too — it's hidden on this side only, and a new
 * application from them shows as usual. Nothing is sent to them.
 */
function deleteCandidate(id: string) {
  const c = cardsNow().find((x) => x.id === id);
  // Only from Dropped: anyone still in the running is dropped first.
  if (!c?.dropped) return;
  const deal = readDeal();
  if (id === DEAL_ID) {
    if (deal) removedStore.set((r) => (r.includes(dealKey(deal)) ? r : [...r, dealKey(deal)]));
    return;
  }
  candidatesStore.set((cs) => cs.filter((x) => x.id !== id));
  // Their past interviews stay on record, no longer pointing at a card that's gone.
  interviewsStore.set((is) => is.map((i) => (i.candidate === id ? { ...i, candidate: undefined } : i)));
}

function invite(independent: string, role: string, note?: string) {
  if (cardsNow().some((c) => c.independent === independent && c.role === role)) return;
  // The live pair: the invite is shared, so it reaches their side — and reopens a role that
  // turned them down before (recordInvite). It opens the thread, and the note goes in it as the
  // Team Builder's first message.
  if (independent === PAIR.independent.slug) {
    recordInvite(role);
    move("invite", roleOf(role), note?.trim() ? { message: note.trim() } : undefined);
  }
  candidatesStore.set((cs) => [{ id: `c${Date.now()}`, independent, role, stage: "matched", status: { label: "Awaiting application", tone: "neutral" }, submitted: "Invited just now", invitedToApply: true }, ...cs.filter((c) => !(c.independent === independent && c.role === role))]);
}

/**
 * TB-037 — book an interview for a tracker card. For the live pair it goes on the shared
 * engagement, so it lands in their pipeline (IN-018 Interview Requested); someone who never
 * applied — invited from Discover, or matched — has no engagement yet, and this starts one.
 * Booking again after a decline or a cancellation replaces the old slot.
 */
function inviteToInterview(candidateId: string, slot: { when: string; format: string; link?: string; note?: string }) {
  const c = cardsNow().find((x) => x.id === candidateId);
  // TB-037 — an interview is for someone who has applied. A match invited to apply hasn't yet:
  // there's no application to interview them about until they do.
  if (!c || awaitsApplication(c)) return;
  const role = roleOf(c.role);
  const interview = { when: slot.when, format: slot.format, link: slot.link, note: slot.note?.trim() || undefined };
  if (candidateId === DEAL_ID) {
    // IN-093 — the very slot the talent asked for needs no second yes from them: it's confirmed,
    // and it keeps the clock they asked in. Any other slot is picked in the Team Builder's.
    const deal = readDeal();
    const requested = deal?.interview?.outcome === "reschedule" ? deal.interview.requested : undefined;
    const asked = requested?.when === slot.when;
    const clock = asked && requested ? { offset: slotOffset(requested.when, requested.offset), by: "independent" as const } : bookedAt(slot.when);
    if (livePair(c)) move(asked ? "interview_moved" : "interview_invited", role, { slot: { when: slot.when, offset: clock.offset, by: clock.by } });
    return updateDeal((d) => ({ ...d, stage: asked ? "invite_accepted" : "invited", interview: { ...interview, offset: clock.offset, by: clock.by, accepted: asked || undefined } }));
  }
  const clock = bookedAt(slot.when);
  // The pair without an engagement: start it at the interview, so the invitation has an
  // application to land on in their pipeline. (One engagement at a time — a second role for
  // the pair stays on this side only rather than overwrite the first.)
  if (livePair(c) && !readDeal() && startDeal({ roleSlug: c.role, title: role.title, company: PAIR.team.company, match: byName(c.independent).match, stage: "invited", invited: true, interview: { ...interview, offset: clock.offset, by: clock.by } })) {
    move("interview_invited", role, { slot: clock });
    return;
  }
  candidatesStore.set((cs) => cs.map((x) => (x.id === candidateId ? { ...x, stage: "invited", status: { label: "Awaiting reply", tone: "neutral", meta: slotForTeam(slot.when, clock.offset, c.independent) } } : x)));
  interviewsStore.set((is) => [
    { id: `iv${Date.now()}`, independent: c.independent, role: role.title, roleSlug: c.role, candidate: c.id, when: slot.when, offset: clock.offset, by: clock.by, format: slot.format, link: slot.link, status: INTERVIEW_STATUS.awaiting },
    ...is.filter((i) => i.candidate !== c.id || i.past),
  ]);
}

/** #153 — a slot the Team Builder picked, in their own clock (their profile's time zone, or this device's). */
const bookedAt = (when: string) => ({ when, offset: teamOffset(), by: "team" as const });

/** #324 — a new time for a booked interview, with the Team Builder's note: the talent is told, reads why, and confirms again. */
function rescheduleInterview(id: string, when: string, note?: string) {
  const iv = interviewsNow().find((i) => i.id === id);
  if (!iv) return;
  const said = note?.trim() || undefined;
  const clock = bookedAt(when);
  if (id === DEAL_ID) {
    const deal = readDeal();
    if (deal) move("interview_rescheduled", roleOf(deal.roleSlug), { slot: clock, note: said });
    return updateDeal((d) => (d.interview ? { ...d, stage: "invited", interview: { ...d.interview, when, offset: clock.offset, by: clock.by, note: said ?? d.interview.note, accepted: false, past: false, outcome: undefined } } : d));
  }
  interviewsStore.set((is) => is.map((i) => (i.id === id ? { ...i, when, offset: clock.offset, by: clock.by, status: INTERVIEW_STATUS.awaiting } : i)));
  if (iv.candidate) candidatesStore.set((cs) => cs.map((x) => (x.id === iv.candidate ? { ...x, stage: "invited", status: { label: "Awaiting reply", tone: "neutral", meta: slotForTeam(when, clock.offset, x.independent) } } : x)));
}

/** #325 — the talent is told, with the reason when one is given; they stay in the pipeline and can be offered another slot. */
function cancelInterview(id: string, reason?: string) {
  const iv = interviewsNow().find((i) => i.id === id);
  if (!iv) return;
  const why = reason?.trim() || undefined;
  if (id === DEAL_ID) {
    const deal = readDeal();
    if (deal) move("interview_cancelled", roleOf(deal.roleSlug), { note: why });
    return updateDeal((d) => (d.interview ? { ...d, stage: "invited", interview: { ...d.interview, past: true, outcome: "cancelled", reason: why } } : d));
  }
  interviewsStore.set((is) => is.map((i) => (i.id === id ? { ...i, status: INTERVIEW_STATUS.cancelled, past: true } : i)));
  if (iv.candidate) candidatesStore.set((cs) => cs.map((x) => (x.id === iv.candidate ? { ...x, stage: "invited", status: { label: INTERVIEW_CANCELLED, tone: "neutral" } } : x)));
}

/**
 * #313 — an interview marked held on its own (its slot had passed) that the Team Builder says didn't
 * happen: back to needing a new slot. It's kept as a cancelled slot, so both sides offer a new one,
 * and the thread says so.
 */
function missInterview(id: string) {
  const deal = readDeal();
  if (id !== DEAL_ID || deal?.stage !== "interviewed" || !deal.interview?.auto) return;
  logStep(`The ${deal.title} interview didn't take place`, { team: `/team/hire/roles/${deal.roleSlug}/candidates/${DEAL_ID}`, independent: `/independent/jobs/applications/${DEAL_ID}` });
  updateDeal((d) => (d.interview ? { ...d, stage: "invited", interview: { ...d.interview, outcome: "cancelled", missed: true, auto: undefined, accepted: false } } : d));
}

/**
 * IN-018 — the Team Builder marks a confirmed interview as held: the candidate moves to
 * Interview completed and the interview to Past. TB-103 Request Proposal waits for this, so a
 * proposal is never asked for before the two sides have actually met.
 */
function completeInterview(id: string) {
  const c = cardsNow().find((x) => x.id === id);
  // Only a confirmed interview that's still on: a declined, cancelled or moved one never took place.
  if (!c || c.stage !== "invite_accepted" || needsNewSlot(c)) return;
  if (id === DEAL_ID) return updateDeal((d) => ({ ...d, stage: "interviewed", interview: d.interview && { ...d.interview, past: true, outcome: "done" } }));
  candidatesStore.set((cs) => cs.map((x) => (x.id === id ? { ...x, stage: "interviewed", status: { label: "Interview completed", tone: "ok" } } : x)));
  interviewsStore.set((is) => is.map((i) => (i.candidate === c.id && !i.past ? { ...i, status: INTERVIEW_STATUS.done, past: true } : i)));
}

export function usePipeline() {
  const deal = useDeal();
  const stored = useStored(candidatesStore);
  const removed = useStored(removedStore);
  const booked = useStored(interviewsStore);
  const candidates = useMemo(() => cardsOf(deal, stored, removed), [deal, stored, removed]);
  const interviews = useMemo(() => interviewsOf(deal, booked), [deal, booked]);
  return {
    candidates,
    /** The thread exists from their application on (Messages also lists it from the invite to apply), the same point the talent sees it open. */
    canChat: canMessage(deal),
    /**
     * TB-017 — an invite to apply only makes sense for someone who is not in the tracker yet. Once
     * they are a candidate or a match, the next move is an interview, not another invite.
     */
    inPipeline: (independent: string) => candidates.some((c) => c.independent === independent && !c.dropped),
    /** Their card, when they're in the tracker — what "View in pipeline" opens. */
    pipelineOf: (independent: string) => candidates.find((c) => c.independent === independent && !c.dropped),
    invite,
    setDropped,
    deleteCandidate,
    requestProposal,
    requestRevision,
    declineProposal,
    /**
     * TB-040 — scheduling an interview from a candidate's profile has to show on their card and
     * the dashboard widget, and a reschedule or cancel has to stick.
     */
    interviews,
    inviteToInterview,
    rescheduleInterview,
    cancelInterview,
    completeInterview,
    missInterview,
  };
}
