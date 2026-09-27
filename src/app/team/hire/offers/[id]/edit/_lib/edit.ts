import { useState } from "react";
import { addWorkingDays, dayLabel, durationDays, trialMonths, fromISODate, isoDay } from "@/lib/demo/dates";
import type { DealOffer } from "@/lib/demo/deal";
import { rateAmount, usd } from "@/lib/demo/disputes";
import { blankDraft, fromDrafts, toDrafts, type DraftTask, type PlannedTask } from "@/lib/demo/tasks";
import { formatMoney } from "@/lib/portal/money";
import type { Role } from "@/lib/team/data";

/** Hireable's platform fee on a trial's escrow, charged on top of it. */
export const FEE_RATE = 0.1;

/**
 * The edit in progress, starting from the offer as it was sent — its rate, start date, hours and
 * tasks — and the signature the new version goes out with.
 */
export function useOfferEdits(live: DealOffer | undefined) {
  const [rate, setRate] = useState(live ? formatMoney(String(rateAmount(live.rate))) : "");
  const [start, setStart] = useState(live?.start ?? "");
  const [hours, setHours] = useState(String(live?.hours ?? ""));
  const [taskRows, setTaskRows] = useState<DraftTask[]>(() => (live?.tasks.length ? toDrafts(live.tasks) : [blankDraft()]));
  const [name, setName] = useState("");
  const [agree, setAgree] = useState(false);
  return { rate, setRate, start, setStart, hours, setHours, taskRows, setTaskRows, name, setName, agree, setAgree };
}

/**
 * What the edited terms come to: a trial's end date and escrow against what's already funded, what
 * changed from the offer as sent, and whether the new version can go out.
 */
export function offerEdit(live: DealOffer, role: Role, { rate, start, hours, taskRows, name, agree }: { rate: string; start: string; hours: string; taskRows: DraftTask[]; name: string; agree: boolean }) {
  const trial = live.type === "trial";
  const partTime = live.type === "part-time";
  const days = durationDays(role.duration);
  const months = trialMonths(days);
  const amount = rateAmount(rate);
  const startDate = fromISODate(start);
  // The start day is day one of the trial, so its last day is `days - 1` working days later.
  const end = trial && startDate ? isoDay(addWorkingDays(startDate, days - 1)) : "";
  const escrow = amount * months;
  const fee = Math.round(escrow * FEE_RATE * 100) / 100;
  const funded = live.deposit?.escrow ?? rateAmount(live.rate) * months;
  const delta = escrow - funded;
  const weekly = Number(hours);
  const tasks = fromDrafts(taskRows);
  /** A task list in a shape two can be compared by, ids and key order aside. */
  const plan = (list: PlannedTask[]) => JSON.stringify(list.map((x) => [x.title, x.week ?? 0, x.priority ?? "", x.description ?? ""]));
  const tasksChanged = plan(tasks) !== plan(live.tasks);
  const payLabel = live.type === "full-time" ? "Salary" : "Rate";
  /** Only what differs from the offer they have now — it used to restate every term, "$850 → $850" included. */
  const changes = [
    amount !== rateAmount(live.rate) && `${payLabel.toLowerCase()} ${live.rate} → ${usd(amount)}/mo`,
    start !== live.start && `start to ${start ? dayLabel(fromISODate(start)) : "—"}`,
    partTime && weekly !== live.hours && `hours to ${weekly || "—"} a week`,
    tasksChanged && `the tasks (${tasks.length})`,
  ].filter((c): c is string => !!c);
  const changed = changes.length > 0;
  const signed = name.trim().length > 2 && agree;
  /** A trial is judged on its tasks, so it keeps at least one. */
  const valid = amount > 0 && !!startDate && (!partTime || (Number.isInteger(weekly) && weekly >= 1 && weekly <= 40)) && (!trial || tasks.length > 0);
  return { trial, partTime, days, months, amount, startDate, end, escrow, fee, funded, delta, weekly, tasks, payLabel, changes, changed, signed, valid };
}

/** The edited offer's figures and checks, as `offerEdit` works them out. */
export type OfferEdit = ReturnType<typeof offerEdit>;
