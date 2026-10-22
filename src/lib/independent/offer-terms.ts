import { durationDays, formatDate, fromISODate, parseDay, trialLength } from "@/lib/portal/dates";
import type { DealOffer } from "@/lib/demo/deal";
import { rateAmount, usd } from "@/lib/demo/disputes";
import { hoursLabel, JOB_TYPE_LABEL, payFor } from "@/lib/contract/job-types";
import type { JobView } from "./job-view";

/*
 * A trial offer as the Independent reads it (IN-074): its terms, a row each, how long it stands,
 * and what it pays at the end.
 */

/** Offer dates are stored yyyy-mm-dd; show them the way every other date reads. */
const pretty = (iso: string) => {
  const d = fromISODate(iso);
  return d ? formatDate(d) : iso;
};

/** Seven days from when it was sent (or last changed) — the window the Team Builder's card counts down. */
export function expiryOf(sent: string) {
  const d = parseDay(sent);
  if (!d) return undefined;
  d.setDate(d.getDate() + 7);
  return formatDate(d);
}

/** What a trial pays at its end: the escrow funded with the offer, or, on an offer from before that was kept, its pay, the one total for the trial. */
export const offerTotal = (sent: DealOffer) => sent.deposit?.escrow ?? rateAmount(sent.rate);

/** The terms for the kind of role it is: a trial's length, dates and escrow, or a role's pay. */
export function offerRows(sent: DealOffer, job: JobView, total: number): [string, string][] {
  return sent.type === "trial"
    ? [
        ["Role", job.title],
        ["Contract type", "Trial"],
        ["Duration", trialLength(durationDays(job.duration))],
        ["Start date", pretty(sent.start)],
        ["End date", pretty(sent.end ?? "")],
        ["Pay", payFor(sent.type, sent.rate)],
        ["Payment", "Held in escrow, released at the end of the trial"],
        ["Total payment at end of trial", usd(total)],
      ]
    : [
        ["Role", job.title],
        ["Contract type", JOB_TYPE_LABEL[sent.type]],
        ["Start date", pretty(sent.start)],
        ["Pay", payFor(sent.type, sent.rate)],
        ...(sent.type === "part-time" ? ([["Hours", hoursLabel(sent.hours)]] as [string, string][]) : ([["Benefits", sent.benefits?.length ? sent.benefits.join(", ") : "None"]] as [string, string][])),
        ["Payment", "Monthly, at the end of each month"],
      ];
}
