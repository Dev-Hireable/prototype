"use client";

import { openRequest, revisionOf, type OfferEvent, type OfferRequest } from "@/lib/contract/negotiation";
import { momentLabel, today } from "@/lib/demo/dates";
import { fillPosting, readDeal, updateDeal, type Deal } from "@/lib/demo/deal";
import { rateAmount } from "@/lib/demo/disputes";
import { move, PAIR } from "@/lib/demo/live";
import { checkSuggestion, type TaskSuggestion } from "@/lib/demo/suggestions";
import { taskFromOffer } from "@/lib/demo/tasks";
import { signedTerms } from "@/lib/work/deal-scope";
import { NOTE_MAX } from "@/lib/work/model";
import { EMPTY_SCOPE, firstVersion } from "@/lib/work/scope";

/*
 * The talent's side of an offer under review (IN-074 / IN-092 / @/lib/contract/negotiation): sign the
 * revision they read, or ask for changes to it. Each re-reads the saved offer first, so a revision the
 * Team Builder sent meanwhile is never signed unread, and each says why when it's refused.
 */

export type OfferResult = { ok: true } | { ok: false; error: string };
const fail = (error: string): OfferResult => ({ ok: false, error });

const talentEvent = (kind: OfferEvent["kind"], revision: number, note?: string): OfferEvent => ({ kind, revision, at: momentLabel(), ts: Date.now(), by: "independent", name: PAIR.independent.name, ...(note ? { note } : {}) });

const logged = (o: NonNullable<Deal["offer"]>, e: OfferEvent) => [...(o.log ?? []), e];

/** Why the offer on `d` can't be answered now, or null while it's out. */
function closedOffer(d: Deal | null): string | null {
  const o = d?.offer;
  if (!d || !o || d.dropped) return "This offer isn't open any more.";
  if (o.status === "accepted") return "You've already signed this offer.";
  if (o.status === "withdrawn") return `${d.company} withdrew this offer.`;
  if (o.status === "declined") return "You declined this offer.";
  return null;
}

/** Why the talent can't sign `revision` of the offer on `d`, or null. */
function signRefusal(d: Deal | null, revision: number): string | null {
  const closed = closedOffer(d);
  if (closed || !d?.offer) return closed;
  const now = revisionOf(d.offer);
  if (now !== revision) return `${d.company} revised the offer while you were reading it — it's revision ${now} now. Read what changed, then sign.`;
  if (openRequest(d.offer)) return `You asked for changes to revision ${revision}. Withdraw your request to sign it as it stands, or wait for ${d.company}'s answer.`;
  return null;
}

/**
 * The contract the signed offer starts: its tasks become the list both sides work from (due weeks
 * turned into dates), a trial holds the escrow funded with the offer, and the scope's v1 is the
 * revision signed — its terms and those tasks, as agreed.
 */
function signedContract(x: Deal, o: NonNullable<Deal["offer"]>): NonNullable<Deal["contract"]> {
  const trial = o.type === "trial";
  const tasks = o.tasks.map((t, i) => taskFromOffer(t, i, o.start, { trialEnd: trial ? o.end : undefined, created: today(), name: PAIR.team.name }));
  const contract: NonNullable<Deal["contract"]> = {
    started: o.start,
    ends: trial ? o.end : undefined,
    rate: o.rate,
    hours: o.type === "part-time" ? o.hours : undefined,
    benefits: o.type === "full-time" ? o.benefits : undefined,
    deposit: trial ? o.deposit?.escrow : undefined,
    tasks,
    nextNumber: o.tasks.length + 1,
    activity: [],
    streak: 0,
  };
  const terms = signedTerms({ ...x, contract });
  return terms ? { ...contract, scope: { ...EMPTY_SCOPE, versions: [firstVersion({ terms, items: tasks, at: momentLabel(), ts: Date.now() }, revisionOf(o))] } } : contract;
}

/** IN-074 — signing the revision the talent read, as the contract. */
export function acceptOffer(revision: number): OfferResult {
  const out = { refused: signRefusal(readDeal(), revision) };
  if (out.refused) return fail(out.refused);
  updateDeal((x) => {
    out.refused = signRefusal(x, revision);
    if (out.refused || !x.offer) return x;
    return { ...x, stage: "hired", offer: { ...x.offer, status: "accepted", log: logged(x.offer, talentEvent("accepted", revision)) }, contract: x.contract ?? signedContract(x, x.offer) };
  });
  if (out.refused) return fail(out.refused);
  const d = readDeal();
  if (d) {
    move("offer_accepted", { slug: d.roleSlug, title: d.title });
    // The hire takes the role's seat; a full posting leaves the job board.
    fillPosting(d.roleSlug);
  }
  return { ok: true };
}

/** What asking for changes sends: the revision it's about, a note, task suggestions, and the rate the talent would sign for. */
export type ChangeRequest = { revision: number; note: string; suggestions: TaskSuggestion[]; rate?: string };

/** Why the request can't go as written, or null. The form and the save read the same rules. */
export function checkRequest(r: ChangeRequest, tasks: Parameters<typeof checkSuggestion>[1]): string | null {
  const note = r.note.trim();
  if (!note) return "Say what you'd change, so the company knows what to revise.";
  if (note.length > NOTE_MAX) return `Keep the note under ${NOTE_MAX.toLocaleString("en-US")} characters.`;
  for (const s of r.suggestions) {
    const e = checkSuggestion(s, tasks);
    if (e) return e;
  }
  if (r.rate?.trim() && rateAmount(r.rate) <= 0) return "Enter a rate above $0.";
  return null;
}

/** Why the request can't be sent on the offer as saved, or null. */
function requestRefusal(d: Deal | null, r: ChangeRequest): string | null {
  const closed = closedOffer(d);
  if (closed || !d?.offer) return closed;
  const now = revisionOf(d.offer);
  if (now !== r.revision) return `${d.company} revised the offer while you were writing — it's revision ${now} now. Read it first; your request wasn't sent.`;
  if (openRequest(d.offer)) return `You've already asked for changes to revision ${now}.`;
  return checkRequest(r, d.offer.tasks);
}

/**
 * IN-092 — asking for changes to the revision read: the Team Builder answers each in the next
 * revision. Nothing on the offer changes until they send it.
 */
export function requestOfferChanges(r: ChangeRequest): OfferResult {
  const out = { refused: requestRefusal(readDeal(), r) };
  if (out.refused) return fail(out.refused);
  const note = r.note.trim();
  const request: OfferRequest = { revision: r.revision, at: momentLabel(), note, suggestions: r.suggestions, ...(r.rate?.trim() ? { rate: r.rate.trim() } : {}), status: "open" };
  updateDeal((x) => {
    out.refused = requestRefusal(x, r);
    if (out.refused || !x.offer) return x;
    return { ...x, offer: { ...x.offer, request, log: logged(x.offer, talentEvent("changes_requested", r.revision, note)) } };
  });
  if (out.refused) return fail(out.refused);
  const d = readDeal();
  if (d) move("offer_changes_requested", { slug: d.roleSlug, title: d.title }, { note });
  return { ok: true };
}

/** IN-092 — taking the request back: the revision stands as sent, and can be signed or declined. */
export function withdrawOfferRequest(revision: number): OfferResult {
  const d = readDeal();
  const r = openRequest(d?.offer);
  if (!d || !r || r.revision !== revision) return fail("There's no open request on this revision to withdraw.");
  updateDeal((x) => (x.offer?.request && openRequest(x.offer)?.revision === revision ? { ...x, offer: { ...x.offer, request: { ...x.offer.request, status: "withdrawn" }, log: logged(x.offer, talentEvent("request_withdrawn", revision)) } } : x));
  move("offer_request_withdrawn", { slug: d.roleSlug, title: d.title });
  return { ok: true };
}
