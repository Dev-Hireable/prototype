"use client";

import { notFound, useRouter } from "next/navigation";
import { use, useState } from "react";
import { Button, Card, Checkbox, InfoBanner, Input, LinkButton, ObjectiveRow, Page } from "@/components/independent/ui";
import { DatePicker, fromISODate, startOfToday, toISODate } from "@/components/portal/DatePicker";
import { kindIndex } from "@/components/team/ObjectiveViews";
import { Avatar } from "@/components/team/ui";
import { addWorkingDays, dayLabel, durationDays, trialMonths } from "@/lib/demo/dates";
import { useDeal } from "@/lib/demo/deal";
import { rateAmount, usd } from "@/lib/demo/disputes";
import { AGREEMENT } from "@/lib/independent/data";
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
 * headed "Edit the offer to …" with the amber "not signed yet" note. Rate and start date are the editable terms.
 *
 * It used to read the rate with every character but digits and commas stripped — "$300.00/wk"
 * became 30000 — list three hardcoded objectives, end 30 calendar days after the start, and save
 * without telling the talent. Now it edits the live offer: the rate as agreed, its own objectives,
 * the working-day end date, the escrow top-up or refund, and a notification to sign the new version.
 */
export default function EditOffer({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { offers, roles, updateOffer } = useDemo();
  const deal = useDeal();
  const router = useRouter();
  const live = id === DEAL_ID ? deal?.offer : undefined;
  const [rate, setRate] = useState(live ? formatMoney(String(rateAmount(live.rate))) : "");
  const [start, setStart] = useState(live?.start ?? "");
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

  const days = durationDays(role.duration);
  const months = trialMonths(days);
  const amount = rateAmount(rate);
  const startDate = fromISODate(start);
  const end = startDate ? toISODate(addWorkingDays(startDate, days)) : "";
  const escrow = amount * months;
  const fee = Math.round(escrow * FEE_RATE * 100) / 100;
  const funded = live.deposit?.escrow ?? rateAmount(live.rate) * months;
  const delta = escrow - funded;
  const changed = amount !== rateAmount(live.rate) || start !== live.start;
  const signed = name.trim().length > 2 && agree;
  const valid = amount > 0 && !!startDate;

  const rows: [string, React.ReactNode][] = [
    ["Role", role.title],
    ["Contract type", "Trial"],
    ["Duration", `${role.duration} (${days} working days)`],
    ["Start date", <span key="start" className="block w-44"><DatePicker value={startDate} onChange={(d) => setStart(d ? toISODate(d) : "")} disabled={{ before: startOfToday() }} /></span>],
    ["End date", end ? dayLabel(fromISODate(end)) : "—"],
    ["Rate", <span key="rate" className="flex items-center gap-1">$<Input value={rate} onChange={(e) => setRate(formatMoney(e.target.value))} inputMode="decimal" className="!h-8 !w-28 !px-3 text-right" />/month</span>],
    ["Payment", "Held in escrow, released at the end of the trial"],
    [`Escrow (${months} ${months === 1 ? "month" : "months"})`, usd(escrow)],
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
            {changed ? `Rate ${live.rate} → ${usd(amount)}/mo, starting ${start ? dayLabel(fromISODate(start)) : "—"}.` : "Edit the rate or start date to send an updated version."}
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
            <div className="flex flex-col gap-6 px-6 pb-6">
              <h3 className="text-[16px] leading-[1.5] font-semibold tracking-[0.2px] text-ink">Objectives</h3>
              <div className="flex flex-col gap-2">
                {live.objectives.map((o) => (
                  <ObjectiveRow key={o.id} index={kindIndex(o.kind)}>
                    {o.title}
                  </ObjectiveRow>
                ))}
              </div>
            </div>
            <Divider />
            <div className="flex flex-col gap-6 px-6 pb-6">
              <h3 className="text-[16px] leading-[1.5] font-semibold tracking-[0.2px] text-ink">Agreement Contract</h3>
              <div className="flex h-[320px] flex-col gap-6 overflow-y-auto rounded-lg bg-surface-2 px-4 pt-4 outline -outline-offset-1 outline-border">
                <p className="text-[14px] leading-[1.2] font-semibold tracking-[0.2px] text-ink">Service agreement</p>
                <p className="pb-4 text-[14px] leading-[1.2] tracking-[0.2px] whitespace-pre-line text-ink-2">{AGREEMENT}</p>
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
              {/* The escrow follows the terms: more is charged, or the difference goes back to the card. */}
              <InfoBanner>
                {delta > 0
                  ? `The escrow goes from ${usd(funded)} to ${usd(escrow)}: ${usd(delta)} more, plus its ${usd(delta * FEE_RATE)} fee, is charged to your card.`
                  : delta < 0
                    ? `The escrow goes from ${usd(funded)} to ${usd(escrow)}: ${usd(-delta)} is refunded to your card.`
                    : `The ${usd(funded)} already in escrow covers these terms.`}
              </InfoBanner>
              <Button
                size="lg"
                variant="primary"
                disabled={!signed || !valid || !changed}
                onClick={() => {
                  updateOffer({ rate: `${usd(amount)}/mo`, start, end, deposit: { escrow, fee } });
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
