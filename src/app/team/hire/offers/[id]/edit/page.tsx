"use client";

import { notFound, useRouter } from "next/navigation";
import { use, useState } from "react";
import { Button, Card, Checkbox, InfoBanner, Input, ObjectiveRow, Page } from "@/components/independent/ui";
import { Avatar } from "@/components/team/ui";
import { AGREEMENT } from "@/lib/independent/data";
import { byName } from "@/lib/team/data";
import { useDemo } from "@/lib/team/store";

const OBJECTIVES = ["Drive Qualified Pipeline Through Outreach", "Rebuild the outbound email sequence", "Book 20 qualified demos by day 30"];

function addDays(date: string, days: number) {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "—";
  d.setDate(d.getDate() + days);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

/**
 * Figma "Hire / Edit sent offer": same frame as the Independent offer page (px 140, 1080 wide, left card + 360 sign card),
 * headed "Edit the offer to …" with the amber "not signed yet" note. Rate and start date are the editable terms.
 */
export default function EditOffer({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { offers, roles, setOffer } = useDemo();
  const offer = offers.find((o) => o.id === id);
  if (!offer) notFound();
  const router = useRouter();
  const p = byName(offer.independent);
  const role = roles.find((r) => r.title === offer.role) ?? roles[0];
  const trial = role.type === "trial";
  const first = p.name.split(" ")[0];
  const [rate, setRate] = useState(offer.rate.replace(/[^0-9,]/g, ""));
  const [start, setStart] = useState(offer.start);
  const [name, setName] = useState("");
  const [agree, setAgree] = useState(false);
  const signed = name.trim().length > 2 && agree;
  const changed = `$${rate}` !== offer.rate.split(" ")[0] || start !== offer.start;
  const back = () => router.push("/team/hire/offers");

  const rows: [string, React.ReactNode][] = [
    ["Role", offer.role],
    ["Contract type", trial ? "Trial" : "Full-time"],
    ["Duration", trial ? role.duration : "Ongoing"],
    ["Start date", <Input key="start" value={start} onChange={(e) => setStart(e.target.value)} className="!h-8 !w-40 !px-3 text-right" />],
    ["End date", trial ? addDays(start, 30) : "—"],
    ["Rate", <span key="rate" className="flex items-center gap-1">$<Input value={rate} onChange={(e) => setRate(e.target.value)} inputMode="numeric" className="!h-8 !w-24 !px-3 text-right" />/month</span>],
    ["Payment cadence", trial ? "Monthly" : "Monthly"],
    ["Pay in", trial ? "End of trial (1 payment)" : "End of each month"],
    [trial ? "Total payment at end of trial" : "First month total", `$${rate || "0"}.00`],
  ];

  return (
    <Page title="Edit offer" heading="modal" onClose={back} padded={false}>
      <div className="mx-auto flex w-[1080px] flex-col gap-10 pt-10 pb-20">
        <div className="flex flex-col gap-2">
          <h2 className="font-display text-[32px] leading-[1.5] font-semibold text-black" style={{ fontVariationSettings: '"opsz" 14' }}>
            Edit the offer to {p.name}
          </h2>
          <p className="text-[14px] leading-[1.2] tracking-[0.2px] text-ink-2">Change the terms below. {first} gets the new version to sign and the offer they have now is replaced.</p>
          <InfoBanner tone="warn">
            Sent on {offer.sent}, not signed yet.{changed ? ` Rate changed from ${offer.rate.split(" ")[0]}.00 to $${rate}.00 per month.` : " Edit the rate or start date to send an updated version."}
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
                {OBJECTIVES.map((ob, i) => (
                  <ObjectiveRow key={ob} index={i}>
                    {ob}
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
              <InfoBanner>Hireable will hold your payment when this offer is sent. Payment is only released to the talent after the trial ends and your evaluation is submitted.</InfoBanner>
              <Button
                size="lg"
                variant="primary"
                disabled={!signed}
                onClick={() => {
                  setOffer(offer.id, { rate: `$${rate} /month`, start, sent: "Today" });
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
