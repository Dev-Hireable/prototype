import type { ReactNode } from "react";
import { Card, Input } from "@/components/independent/ui";
import { DatePicker } from "@/components/portal/DatePicker";
import { Agreement, OfferDivider, OfferTerms } from "@/components/portal/OfferParts";
import { TaskPlanEditor } from "@/components/portal/tasks/TaskPlan";
import { dayLabel, fromISODate, isoDay, startOfToday } from "@/lib/demo/dates";
import type { DealOffer } from "@/lib/demo/deal";
import { usd } from "@/lib/demo/disputes";
import { JOB_TYPE_LABEL } from "@/lib/demo/job-types";
import { planWeeks, type DraftTask } from "@/lib/demo/tasks";
import type { Role } from "@/lib/team/data";
import { formatMoney } from "@/lib/portal/money";
import type { OfferEdit } from "../_lib/edit";

/** The editable terms, as the values of their rows. */
type Fields = { start: ReactNode; rate: ReactNode; hours: ReactNode };

/** A trial's terms: the end date and the escrow follow the start date and rate being edited. */
function trialRows(role: Role, { days, end, months, escrow }: OfferEdit, fields: Fields): [string, ReactNode][] {
  return [
    ["Role", role.title],
    ["Contract type", "Trial"],
    ["Duration", `${role.duration} (${days} working days)`],
    ["Start date", fields.start],
    ["End date", end ? dayLabel(fromISODate(end)) : "—"],
    ["Rate", fields.rate],
    ["Payment", "Held in escrow, released at the end of the trial"],
    [`Escrow (${months} ${months === 1 ? "month" : "months"})`, usd(escrow)],
  ];
}

/** An ongoing role's terms: the start date and pay, then the hours (part-time) or the benefits it was offered with. */
function ongoingRows(live: DealOffer, role: Role, { payLabel, partTime }: OfferEdit, fields: Fields): [string, ReactNode][] {
  return [
    ["Role", role.title],
    ["Contract type", JOB_TYPE_LABEL[live.type]],
    ["Start date", fields.start],
    [payLabel, fields.rate],
    ...(partTime
      ? ([["Hours a week", fields.hours]] as [string, ReactNode][])
      : ([["Exclusive benefits", live.benefits?.length ? live.benefits.join(", ") : "None"]] as [string, ReactNode][])),
    ["Payment", "Monthly, at the end of each month"],
  ];
}

/** "Offer Details", with the pay, the start date and — part-time — the hours as fields in their rows. */
function OfferDetails({
  live,
  role,
  edit,
  rate,
  onRate,
  onStart,
  hours,
  onHours,
}: {
  live: DealOffer;
  role: Role;
  edit: OfferEdit;
  rate: string;
  onRate: (rate: string) => void;
  onStart: (start: string) => void;
  hours: string;
  onHours: (hours: string) => void;
}) {
  const fields: Fields = {
    rate: (
      <span key="rate" className="flex items-center gap-1">
        $<Input value={rate} onChange={(e) => onRate(formatMoney(e.target.value))} inputMode="decimal" aria-label={edit.payLabel} className="!h-8 !w-28 !px-3 text-right" />
        /month
      </span>
    ),
    start: (
      <span key="start" className="block w-44">
        <DatePicker value={edit.startDate} onChange={(d) => onStart(d ? isoDay(d) : "")} disabled={{ before: startOfToday() }} aria-label="Start date" />
      </span>
    ),
    hours: <Input key="hours" value={hours} onChange={(e) => onHours(e.target.value.replace(/[^0-9]/g, ""))} inputMode="numeric" aria-label="Hours a week" className="!h-8 !w-20 !px-3 text-right" />,
  };
  return <OfferTerms rows={edit.trial ? trialRows(role, edit, fields) : ongoingRows(live, role, edit, fields)} />;
}

/** The offer as it will read: the role, its terms with the editable ones in place, the tasks it sets, and the agreement. */
export function TermsCard({
  live,
  role,
  edit,
  first,
  rate,
  onRate,
  onStart,
  hours,
  onHours,
  taskRows,
  onTaskRows,
}: {
  live: DealOffer;
  role: Role;
  edit: OfferEdit;
  first: string;
  rate: string;
  onRate: (rate: string) => void;
  onStart: (start: string) => void;
  hours: string;
  onHours: (hours: string) => void;
  taskRows: DraftTask[];
  onTaskRows: (rows: DraftTask[]) => void;
}) {
  const { trial, days, tasks } = edit;
  return (
    <Card className="flex min-w-0 flex-1 flex-col overflow-hidden">
      <div className="flex flex-col gap-4 px-6 pt-6 text-ink">
        <h3 className="text-[20px] leading-[1.5] font-semibold tracking-[0.4px]">{role.title}</h3>
        <p className="text-[14px] leading-[1.2] tracking-[0.2px]">{role.description}</p>
      </div>
      <OfferDivider />
      <div className="flex flex-col gap-4 px-6 pb-6">
        <OfferDetails live={live} role={role} edit={edit} rate={rate} onRate={onRate} onStart={onStart} hours={hours} onHours={onHours} />
      </div>
      <OfferDivider />
      <div className="flex flex-col gap-4 px-6 pb-6">
        <div className="flex flex-col gap-1">
          <h3 className="text-[16px] leading-[1.5] font-semibold tracking-[0.2px] text-ink">Tasks</h3>
          <p className="text-[13px] leading-[1.4] text-ink-2">
            {trial ? `What ${first} gets done in the trial. They become its shared task list when ${first} signs.` : `The first tasks ${first} starts on — optional, since you can add more once the contract starts.`}
          </p>
        </div>
        <TaskPlanEditor rows={taskRows} onChange={onTaskRows} weeks={planWeeks(trial ? days : null)} placeholder={trial ? "Name a task for the trial" : "Name a first task"} />
        {trial && tasks.length === 0 && <p className="text-[12px] leading-[1.4] text-danger">A trial needs at least one task.</p>}
      </div>
      <OfferDivider />
      <div className="flex flex-col gap-6 px-6 pb-6">
        <h3 className="text-[16px] leading-[1.5] font-semibold tracking-[0.2px] text-ink">Agreement Contract</h3>
        <Agreement type={live.type} title="Service agreement" />
      </div>
    </Card>
  );
}
