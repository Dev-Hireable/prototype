/**
 * Where an application stands, in order: the rows of the talent's tracker (PipelineTracker) and the
 * stages behind the Team Builder's columns. `major` stages are the tracker's milestones; the others
 * sit between them.
 */
export const PIPELINE = [
  { key: "applied", label: "Applied", major: true },
  { key: "matched", label: "Matched", major: true },
  { key: "invited", label: "Interview invitation received", major: false },
  { key: "invite_accepted", label: "Invitation accepted", major: false },
  { key: "interviewed", label: "Interview completed", major: true },
  { key: "proposal_requested", label: "Proposal requested", major: false },
  { key: "proposal_sent", label: "Proposal sent", major: true },
  { key: "offer_received", label: "Offer received", major: false },
  { key: "offer_accepted", label: "Offer accepted", major: true },
  { key: "hired", label: "Hired", major: true },
] as const;
export type Stage = (typeof PIPELINE)[number]["key"];
