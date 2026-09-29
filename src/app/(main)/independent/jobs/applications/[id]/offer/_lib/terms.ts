import { formatDate, fromISODate, parseDay } from "@/lib/portal/dates";
import type { DealOffer } from "@/lib/demo/deal";
import { usd } from "@/lib/demo/disputes";
import { hoursLabel, JOB_TYPE_LABEL } from "@/lib/contract/job-types";
import type { JobView } from "@/lib/independent/job-view";

/** Offer dates are stored yyyy-mm-dd; show them the way every other date reads. */
export const pretty = (iso: string) => {
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

/** The terms for the kind of role it is: a trial's dates and escrow, or an ongoing role's pay. */
export function offerRows(sent: DealOffer, job: JobView, total: number): [string, string][] {
  return sent.type === "trial"
    ? [
        ["Role", job.title],
        ["Contract type", "Trial"],
        ["Duration", job.duration],
        ["Start date", pretty(sent.start)],
        ["End date", pretty(sent.end ?? "")],
        ["Rate", sent.rate],
        ["Payment", "Held in escrow, released at the end of the trial"],
        ["Total payment at end of trial", usd(total)],
      ]
    : [
        ["Role", job.title],
        ["Contract type", JOB_TYPE_LABEL[sent.type]],
        ["Start date", pretty(sent.start)],
        [sent.type === "full-time" ? "Salary" : "Rate", sent.rate],
        ...(sent.type === "part-time" ? ([["Hours", hoursLabel(sent.hours)]] as [string, string][]) : ([["Exclusive benefits", sent.benefits?.length ? sent.benefits.join(", ") : "None"]] as [string, string][])),
        ["Payment", "Monthly, at the end of each month"],
      ];
}
