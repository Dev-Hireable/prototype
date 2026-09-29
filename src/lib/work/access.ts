import { trialClosed } from "@/lib/contract/lifecycle";
import { dayLabel, isoDay, parseDay } from "@/lib/portal/dates";
import { lifecycleOfDeal, type Deal } from "@/lib/demo/deal";
import { migrateProjects } from "./migrate";
import { CLOSED, type WorkAccess } from "./permissions";

/**
 * Where the live contract is, as far as its work goes — its lifecycle phase (@/lib/contract/lifecycle):
 *
 *   starts             the Team Builder can plan; the Independent's work opens on the first day
 *   trial / ongoing    open
 *   evaluation,        the trial is over and being decided: no new work, nothing sent back — only
 *   decision, offer    approving what's in review, and the Team Builder wrapping up their own items
 *   ended              read-only
 *
 * Worked out from the deal each time the repository runs, so a trial that closes mid-session stops
 * taking work at once.
 */
export function accessOf(deal: Deal | null, now = new Date()): WorkAccess {
  const l = lifecycleOfDeal(deal, now);
  const c = deal?.contract;
  if (!l || !c) return CLOSED;
  const trial = l.type === "trial";
  const end = trial ? parseDay(c.ends) : undefined;
  const lastDay = end ? isoDay(end) : undefined;
  const since = trial ? undefined : parseDay(l.since);
  const roleSince = since ? isoDay(since) : undefined;
  /** TB-148 — finished (and archived) projects' work is read-only. */
  const done = trial ? [] : migrateProjects(c.projects).filter((p) => p.status === "done").map((p) => p.id);
  const finishedProjects = done.length ? done : undefined;
  if (l.phase === "ended") return { open: false, reviewOpen: false, trial, lastDay, roleSince, finishedProjects, closedReason: "This contract has ended, so its work is read-only." };
  if (trialClosed(l)) {
    const how = l.trial?.closedEarly ? "The trial closed early, every trial task approved" : `The trial ended on ${dayLabel(l.trial?.ends)}`;
    const why = l.phase === "evaluation" ? " while it's evaluated" : "";
    return { open: false, reviewOpen: true, trial, lastDay, trialClosed: true, closedReason: `${how}, so its work is closed${why}. What's in review can still be approved.` };
  }
  return { open: true, reviewOpen: true, trial, lastDay, roleSince, finishedProjects, startsOn: l.phase === "starts" ? dayLabel(l.since) : undefined };
}
