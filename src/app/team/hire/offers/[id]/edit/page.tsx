"use client";

import { notFound, useRouter } from "next/navigation";
import { use, useState } from "react";
import { Button, Card, Checkbox, InfoBanner, Input, LinkButton, Page } from "@/components/independent/ui";
import { DatePicker, fromISODate, startOfToday, toISODate } from "@/components/portal/DatePicker";
import { blankDraft, fromDrafts, TaskPlanEditor, toDrafts } from "@/components/portal/tasks/TaskPlan";
import type { DraftTask } from "@/components/portal/tasks/TaskPlan";
import { Avatar } from "@/components/team/ui";
import { addWorkingDays, dayLabel, durationDays, trialMonths } from "@/lib/demo/dates";
import { useDeal } from "@/lib/demo/deal";
import { rateAmount, usd } from "@/lib/demo/disputes";
import { JOB_TYPE_LABEL } from "@/lib/demo/job-types";
import { planWeeks } from "@/lib/demo/tasks";
import type { PlannedTask } from "@/lib/demo/tasks";
import { agreementFor } from "@/lib/independent/data";
import { byName } from "@/lib/team/data";
import { DEAL_ID } from "@/lib/team/deal-view";
import { useDemo } from "@/lib/team/store";

const FEE_RATE = 0.1;

/** Live money formatting for the rate field: digits, thousands commas, at most two decimals. */
function formatMoney(raw: string) {
  const clean = raw.replace(/[^0-9.]/g, "");
  const dot = clean.indexOf(".");
  const int = (dot < 0 ? clean : clean.slice(0, dot)).replace(/^0+(?=\d)/, "").replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return dot < 0 ? int : `${int || "0"}.${clean.slice(dot + 1).replace(/\./g, "").slice(0, 2)}`;
}

/**
 * Figma "Hire / Edit sent offer": same frame as the Independent offer page (px 140, 1080 wide, left card + 360 sign card),
 * headed "Edit the offer to …" with the amber "not signed yet" note.
 *
 * The editable terms follow the offer's type: a trial's rate and start date (its end date and escrow
 * follow), or an ongoing role's pay, start date and — part-time — hours a week. The tasks the offer
 * sets can be changed too. The talent is told and signs the new version.
 */
export default function EditOffer({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { offers, roles, updateOffer } = useDemo();
  const deal = useDeal();
  const router = useRouter();
  const live = id === DEAL_ID ? deal?.offer : undefined;
  const [rate, setRate] = useState(live ? formatMoney(String(rateAmount(live.rate))) : "");
  const [start, setStart] = useState(live?.start ?? "");
  const [hours, setHours] = useState(String(live?.hours ?? ""));
  const [taskRows, setTaskRows] = useState<DraftTask[]>(() => (live?.tasks.length ? toDrafts(live.tasks) : [blankDraft()]));
  const [name, setName] = useState("");
  const [agree, setAgree] = useState(false);
  const offer = offers.find((o) => o.id === id);
  const role = roles.find((r) => r.slug === deal?.roleSlug);
  if (!offer || !live || !deal || !role) notFound();
  const back = () => router.push("/team/hire/offers");
  const p = byName(offer.independent);
  const first = p.name.split(" ")[0];

  // Only an offer still waiting on an answer can be edited; after a decline the next step is a new offer.
  if (live.status !== "sent")
    return (
      <Page title="Edit offer" heading="modal" onClose={back} padded={false}>
        <div className="mx-auto flex w-[640px] flex-col gap-4 pt-10">
          <InfoBanner tone="warn">This offer was {live.status} and can&apos;t be edited. {live.status === "declined" ? `Send ${first} a new offer from their candidate profile instead.` : ""}</InfoBanner>
          <LinkButton size="lg" href={`/team/hire/roles/${deal.roleSlug}/candidates/${DEAL_ID}`} className="self-start">
            Open {first}&apos;s profile
          </LinkButton>
        </div>
      </Page>
    );

  const trial = live.type === "trial";
  const partTime = live.type === "part-time";
  const days = durationDays(role.duration);
  const months = trialMonths(days);
  const amount = rateAmount(rate);
  const startDate = fromISODate(start);
  // The start day is day one of the trial, so its last day is `days - 1` working days later.
  const end = trial && startDate ? toISODate(addWorkingDays(startDate, days - 1)) : "";
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

  const rateField = (
    <span key="rate" className="flex items-center gap-1">
      $<Input value={rate} onChange={(e) => setRate(formatMoney(e.target.value))} inputMode="decimal" aria-label={payLabel} className="!h-8 !w-28 !px-3 text-right" />
      /month
    </span>
  );
  const startField = (
    <span key="start" className="block w-44">
      <DatePicker value={startDate} onChange={(d) => setStart(d ? toISODate(d) : "")} disabled={{ before: startOfToday() }} aria-label="Start date" />
    </span>
  );
  const rows: [string, React.ReactNode][] = trial
    ? [
        ["Role", role.title],
        ["Contract type", "Trial"],
        ["Duration", `${role.duration} (${days} working days)`],
        ["Start date", startField],
        ["End date", end ? dayLabel(fromISODate(end)) : "—"],
        ["Rate", rateField],
        ["Payment", "Held in escrow, released at the end of the trial"],
        [`Escrow (${months} ${months === 1 ? "month" : "months"})`, usd(escrow)],
      ]
    : [
        ["Role", role.title],
        ["Contract type", JOB_TYPE_LABEL[live.type]],
        ["Start date", startField],
        [payLabel, rateField],
        ...(partTime
          ? ([
              [
                "Hours a week",
                <Input key="hours" value={hours} onChange={(e) => setHours(e.target.value.replace(/[^0-9]/g, ""))} inputMode="numeric" aria-label="Hours a week" className="!h-8 !w-20 !px-3 text-right" />,
              ],
            ] as [string, React.ReactNode][])
          : ([["Exclusive benefits", live.benefits?.length ? live.benefits.join(", ") : "None"]] as [string, React.ReactNode][])),
        ["Payment", "Monthly, at the end of each month"],
      ];

  return (
    <Page title="Edit offer" heading="modal" onClose={back} padded={false}>
      <div className="mx-auto flex w-[1080px] flex-col gap-10 pt-10 pb-20">
        <div className="flex flex-col gap-2">
          <h2 className="font-display text-[32px] leading-[1.5] font-semibold text-black" style={{ fontVariationSettings: '"opsz" 14' }}>
            Edit the offer to {p.name}
          </h2>
          <p className="text-[14px] leading-[1.2] tracking-[0.2px] text-ink-2">Change the terms below. {first} is notified, gets the new version to sign, and the offer they have now is replaced.</p>
          <InfoBanner tone="warn">
            Sent on {live.sent}, not signed yet.{" "}
            {changed ? `Changing ${changes.join(" · ")}.` : `Edit the ${payLabel.toLowerCase()}, start date${partTime ? ", hours" : ""} or tasks to send an updated version.`}
          </InfoBanner>
        </div>

        <div className="flex items-start gap-6">
          <Card className="flex min-w-0 flex-1 flex-col overflow-hidden">
            <div className="flex flex-col gap-4 px-6 pt-6 text-ink">
              <h3 className="text-[20px] leading-[1.5] font-semibold tracking-[0.4px]">{role.title}</h3>
              <p className="text-[14px] leading-[1.2] tracking-[0.2px]">{role.description}</p>
            </div>
            <Divider />
            <div className="flex flex-col gap-4 px-6 pb-6">
              <h3 className="text-[16px] leading-[1.5] font-semibold tracking-[0.2px] text-ink">Offer Details</h3>
              <dl className="flex flex-col text-[14px] leading-[1.2] tracking-[0.2px]">
                {rows.map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between border-b border-[#e5e5e5] pt-3 pb-[13px]">
                    <dt className="text-ink-2">{k}</dt>
                    <dd className="text-[#101828]">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>
            <Divider />
            <div className="flex flex-col gap-4 px-6 pb-6">
              <div className="flex flex-col gap-1">
                <h3 className="text-[16px] leading-[1.5] font-semibold tracking-[0.2px] text-ink">Tasks</h3>
                <p className="text-[13px] leading-[1.4] text-ink-2">
                  {trial ? `What ${first} gets done in the trial. They become its shared task list when ${first} signs.` : `The first tasks ${first} starts on — optional, since you can add more once the contract starts.`}
                </p>
              </div>
              <TaskPlanEditor rows={taskRows} onChange={setTaskRows} weeks={planWeeks(trial ? days : null)} placeholder={trial ? "Name a task for the trial" : "Name a first task"} />
              {trial && tasks.length === 0 && <p className="text-[12px] leading-[1.4] text-danger">A trial needs at least one task.</p>}
            </div>
            <Divider />
            <div className="flex flex-col gap-6 px-6 pb-6">
              <h3 className="text-[16px] leading-[1.5] font-semibold tracking-[0.2px] text-ink">Agreement Contract</h3>
              <div className="flex h-[320px] flex-col gap-6 overflow-y-auto rounded-lg bg-surface-2 px-4 pt-4 outline -outline-offset-1 outline-border">
                <p className="text-[14px] leading-[1.2] font-semibold tracking-[0.2px] text-ink">Service agreement</p>
                <p className="pb-4 text-[14px] leading-[1.2] tracking-[0.2px] whitespace-pre-line text-ink-2">{agreementFor(live.type)}</p>
              </div>
            </div>
          </Card>

          <Card className="flex w-[360px] shrink-0 flex-col divide-y divide-[#e5e5e5]">
            <div className="flex flex-col gap-4 p-6">
              <h3 className="text-[16px] leading-[1.5] font-semibold tracking-[0.2px] text-ink">Send Offer to</h3>
              <div className="flex items-center gap-3">
                <Avatar src={p.avatar} size={48} />
                <div>
                  <p className="text-[20px] leading-[1.5] font-semibold tracking-[0.4px] text-primary">{p.name}</p>
                  <p className="text-[14px] leading-[1.2] tracking-[0.2px] text-ink-2">{role.title}</p>
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-4 p-6">
              <h3 className="text-[16px] leading-[1.5] font-semibold tracking-[0.2px] text-ink">Sign contract</h3>
              <p className="text-[14px] leading-[1.2] tracking-[0.2px] text-ink-2">Type your full name to sign. This is your electronic signature confirming commitment to the offer terms.</p>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your full name"
                className="border-b border-border py-2 font-display text-[20px] text-ink italic outline-none placeholder:text-ink-2 focus:border-primary"
                style={{ fontVariationSettings: '"opsz" 14' }}
              />
              <Checkbox checked={agree} onChange={setAgree}>
                <span className="text-[12px] leading-[1.4]">
                  I agree to the <span className="text-primary underline">platform contract</span> and <span className="text-primary underline">terms of service</span>.
                </span>
              </Checkbox>
              {/* A trial's escrow follows the terms: more is charged, or the difference goes back to the card. */}
              {trial && (
                <InfoBanner>
                  {delta > 0
                    ? `The escrow goes from ${usd(funded)} to ${usd(escrow)}: ${usd(delta)} more, plus its ${usd(delta * FEE_RATE)} fee, is charged to your card.`
                    : delta < 0
                      ? `The escrow goes from ${usd(funded)} to ${usd(escrow)}: ${usd(-delta)} is refunded to your card.`
                      : `The ${usd(funded)} already in escrow covers these terms.`}
                </InfoBanner>
              )}
              <Button
                size="lg"
                variant="primary"
                disabled={!signed || !valid || !changed}
                onClick={() => {
                  const offerTasks = tasks.map((t, i) => ({ ...t, id: `task-${i + 1}` }));
                  updateOffer(trial ? { rate: `${usd(amount)}/mo`, start, end, deposit: { escrow, fee }, tasks: offerTasks } : { rate: `${usd(amount)}/mo`, start, hours: partTime ? weekly : undefined, tasks: offerTasks });
                  back();
                }}
              >
                Send updated offer
              </Button>
              <Button size="lg" onClick={back}>
                Cancel
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </Page>
  );
}

/** Figma "Divider Large": 48px tall band with the rule through the middle. */
function Divider() {
  return (
    <span aria-hidden className="flex h-12 items-center px-6">
      <span className="h-px w-full bg-[#e5e5e5]" />
    </span>
  );
}
