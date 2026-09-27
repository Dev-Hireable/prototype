import type { ContractScope, ContractVersion, Amendment, ScopeEvent } from "../work/scope";
import { amendmentState } from "../work/scope";
import type { OfferEvent } from "./negotiation";

/**
 * The contract's history in one list, oldest first: the offer as it was negotiated (sent, changes
 * asked for, revised, signed), each version agreed, and every amendment's steps — who, when, and the
 * values before and after. An amendment left open when the contract stopped taking them (it ended,
 * the trial closed, or the version it changed was replaced) says so at the end.
 */
export type HistoryEntry =
  | { kind: "offer"; key: string; ts: number; event: OfferEvent }
  | { kind: "version"; key: string; ts: number; version: ContractVersion }
  | { kind: "scope"; key: string; ts: number; event: ScopeEvent; version?: ContractVersion }
  | { kind: "unanswered"; key: string; ts: number; amendment: Amendment; state: "superseded" | "closed" };

export function contractHistory(offerLog: readonly OfferEvent[] | undefined, scope: ContractScope, open: boolean): HistoryEntry[] {
  const byNumber = new Map(scope.versions.map((v) => [v.version, v]));
  const entries: HistoryEntry[] = [
    ...(offerLog ?? []).map((event, i): HistoryEntry => ({ kind: "offer", key: `offer-${i}`, ts: event.ts, event })),
    // An amendment's version is its acceptance, which says so; the others are entries of their own.
    ...scope.versions.filter((v) => v.source.kind !== "amendment").map((version): HistoryEntry => ({ kind: "version", key: `v${version.version}`, ts: version.agreedTs, version })),
    ...scope.log.map((event): HistoryEntry => ({ kind: "scope", key: event.id, ts: event.ts, event, version: event.kind === "accepted" ? byNumber.get(event.version) : undefined })),
  ];
  const last = Math.max(0, ...entries.map((e) => e.ts));
  for (const amendment of scope.amendments) {
    const state = amendmentState(amendment, scope, open);
    if (state === "superseded" || state === "closed") entries.push({ kind: "unanswered", key: `open-${amendment.id}`, ts: last + 1, amendment, state });
  }
  // A version made at signing shares its moment with the signature: the signature reads first.
  return entries.sort((a, b) => a.ts - b.ts || (a.kind === "version" ? 1 : 0) - (b.kind === "version" ? 1 : 0));
}

/* -------------------------------------------------------------- the words */

const OFFER_LINE: Record<OfferEvent["kind"], (e: OfferEvent) => string> = {
  sent: (e) => (e.revision > 1 ? `New offer sent — revision ${e.revision}` : "Offer sent — revision 1"),
  revised: (e) => `Offer revised — revision ${e.revision}`,
  changes_requested: (e) => `Changes asked for on revision ${e.revision}`,
  request_withdrawn: (e) => `Change request on revision ${e.revision} withdrawn`,
  accepted: (e) => `Offer signed — revision ${e.revision}`,
  declined: (e) => `Offer declined — revision ${e.revision}`,
  withdrawn: (e) => `Offer withdrawn — revision ${e.revision}`,
};

const SCOPE_LINE: Record<ScopeEvent["kind"], (e: ScopeEvent) => string> = {
  proposed: (e) => `Amendment ${e.amendment} proposed`,
  revised: (e) => `Amendment ${e.amendment} revised`,
  changes_requested: (e) => `Changes asked for on Amendment ${e.amendment}`,
  rejected: (e) => `Amendment ${e.amendment} rejected`,
  withdrawn: (e) => `Amendment ${e.amendment} withdrawn`,
  accepted: (e) => `Amendment ${e.amendment} accepted — contract v${e.version}`,
};

/** How a version came to be, in words. */
function versionLine(v: ContractVersion): string {
  if (v.source.kind === "offer") return `Contract v${v.version} agreed — the signed offer, revision ${v.source.revision}`;
  if (v.source.kind === "conversion") return `Contract v${v.version} agreed — the ${v.terms.type} role after the trial`;
  return `Contract v${v.version} agreed — Amendment ${v.source.number}`;
}

/** What an entry says: its line, who and when, the note that came with it, the version it opens, and the changes it proposed. */
export type EntryView = { title: string; meta: string; note?: string; version?: ContractVersion; changes?: ScopeEvent["changes"] };

export function entryView(e: HistoryEntry): EntryView {
  if (e.kind === "offer") return { title: OFFER_LINE[e.event.kind](e.event), meta: `${e.event.name} · ${e.event.at}`, note: e.event.note };
  if (e.kind === "version") return { title: versionLine(e.version), meta: e.version.agreedAt, version: e.version };
  if (e.kind === "unanswered")
    return {
      title: `Amendment ${e.amendment.number} ${e.state === "superseded" ? "set aside — the contract changed before it was answered" : "closed — the contract stopped taking changes before it was answered"}`,
      meta: `Proposed by ${e.amendment.byName} · ${e.amendment.proposedAt}`,
    };
  // A proposal and its revisions show what they'd change; an acceptance opens the version it made.
  const shows = e.event.kind === "proposed" || e.event.kind === "revised";
  return { title: SCOPE_LINE[e.event.kind](e.event), meta: `${e.event.name} · ${e.event.at}`, note: e.event.note, version: e.version, changes: shows ? e.event.changes : undefined };
}
