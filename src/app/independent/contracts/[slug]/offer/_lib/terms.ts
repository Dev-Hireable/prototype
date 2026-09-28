import type { ReactNode } from "react";
import { formatDate, fromISODate } from "@/lib/demo/dates";
import type { ConversionOffer } from "@/lib/demo/deal";
import { hoursLabel, JOB_TYPE_LABEL } from "@/lib/demo/job-types";
import type { Contract } from "@/lib/independent/data";

export const pretty = (iso: string) => {
  const d = fromISODate(iso);
  return d ? formatDate(d) : iso;
};

/** The offer's terms, a row each: the role, its pay (and a part-time role's hours), and how it's paid and reviewed. */
export function offerRows(offer: ConversionOffer, contract: Contract): [string, ReactNode][] {
  return [
    ["Role", contract.title],
    ["Contract type", JOB_TYPE_LABEL[offer.type]],
    ["Start date", pretty(offer.start)],
    [offer.type === "full-time" ? "Salary" : "Rate", `${offer.salary} /month`],
    ...(offer.type === "part-time" ? ([["Hours", hoursLabel(offer.hours)]] as [string, ReactNode][]) : []),
    ["Payment", "Monthly, at the end of each month"],
    ["Review", "Quarterly, with evaluations as the work goes on"],
  ];
}
