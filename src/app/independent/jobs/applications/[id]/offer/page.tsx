"use client";

import Image from "next/image";
import { notFound, useRouter, useSearchParams } from "next/navigation";
import { use, useState } from "react";
import { Button, Card, Checkbox, InfoBanner, Modal, ObjectiveRow, Page } from "@/components/independent/ui";
import { AGREEMENT, ME, marketingSpecialist as job } from "@/lib/independent/data";
import { useDemo } from "@/lib/independent/store";

/**
 * Figma "Offer · unsigned / · signed / Offer accepted · confirm / Decline offer · modal / Offer updated".
 * Frame: px 140, pt 40, pb 80, gap 40, content 1080 wide; sections p 24 separated by 48px dividers.
 */
export default function Offer({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { applications, setStage } = useDemo();
  const app = applications.find((a) => a.id === id);
  if (!app) notFound();
  const router = useRouter();
  const updated = useSearchParams().get("updated") === "1";
  const back = `/independent/jobs/applications/${app.id}`;
  const [name, setName] = useState("");
  const [agree, setAgree] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [declining, setDeclining] = useState(false);
  const [declined, setDeclined] = useState(false);
  const o = job.offer;
  const rate = updated ? o.updatedRate : o.rate;
  const total = updated ? o.updatedTotal : o.total;
  const signed = name.trim().length > 2 && agree;

  const rows: [string, string][] = [
    ["Role", job.title],
    ["Contract type", "Trial"],
    ["Duration", "30 Days"],
    ["Start date", o.start],
    ["End date", o.end],
    ["Rate", rate],
    ["Payment cadence", o.cadence],
    ["Pay in", o.payIn],
    ["Total payment at end of trial", total],
  ];

  return (
    <Page title="Offer" heading="modal" onClose={() => router.push(back)} padded={false}>
      <div className="mx-auto flex w-[1080px] flex-col gap-10 pt-10 pb-20">
        <div className="flex flex-col gap-2">
          <h2 className="font-display text-[32px] leading-[1.5] font-semibold text-black" style={{ fontVariationSettings: '"opsz" 14' }}>
            {updated ? `Updated offer from ${o.from.replace(" Inc.", "")}` : `Offer from ${o.from}`}
          </h2>
          <p className="text-[14px] leading-[1.2] tracking-[0.2px] text-ink-2">
            {updated ? "Nairobi Solutions changed the terms on 9 Sep 2026. Review and sign the new version; the earlier offer no longer applies." : "Review the full proposal, sign the contract, and confirm your offer"}
          </p>
        </div>
        {updated && <InfoBanner>{o.updatedNote}</InfoBanner>}

        <div className="flex items-start gap-6">
          <Card className="flex min-w-0 flex-1 flex-col overflow-hidden">
            <div className="flex flex-col gap-4 px-6 pt-6 text-ink">
              <h3 className="text-[20px] leading-[1.5] font-semibold tracking-[0.4px]">{job.title}</h3>
              <p className="text-[14px] leading-[1.2] tracking-[0.2px]">{job.description}</p>
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
                {o.objectives.map((ob, i) => (
                  <ObjectiveRow key={ob} index={i}>
                    {ob}
                  </ObjectiveRow>
                ))}
              </div>
            </div>
            <Divider />
            <div className="flex flex-col gap-6 px-6 pb-6">
              <h3 className="text-[16px] leading-[1.5] font-semibold tracking-[0.2px] text-ink">Services Agreement</h3>
              <div className="flex h-[320px] flex-col gap-6 overflow-y-auto rounded-lg bg-surface-2 px-4 pt-4 outline -outline-offset-1 outline-border">
                <p className="text-[14px] leading-[1.2] font-semibold tracking-[0.2px] text-ink">Services Agreement</p>
                <p className="pb-4 text-[14px] leading-[1.2] tracking-[0.2px] whitespace-pre-line text-ink-2">{AGREEMENT}</p>
              </div>
            </div>
          </Card>

          <Card className="flex w-[360px] shrink-0 flex-col divide-y divide-[#e5e5e5]">
            <div className="flex flex-col gap-4 p-6">
              <h3 className="text-[16px] leading-[1.5] font-semibold tracking-[0.2px] text-ink">Offer from</h3>
              <div className="flex items-center gap-3">
                <Image src={ME.avatar} alt="" width={88} height={88} className="size-11 rounded-full object-cover grayscale" />
                <div>
                  <p className="text-[16px] leading-[1.5] font-semibold tracking-[0.2px] text-ink">{job.builder.contact}</p>
                  <p className="text-[14px] leading-[1.2] tracking-[0.2px] text-ink-2">{job.builder.company}</p>
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
                disabled={accepted || declined}
                className="border-b border-border py-2 font-display text-[20px] text-ink italic outline-none placeholder:text-ink-2 focus:border-primary"
                style={{ fontVariationSettings: '"opsz" 14' }}
              />
              <Checkbox checked={agree} onChange={setAgree} disabled={accepted || declined}>
                <span className="text-[12px] leading-[1.4]">
                  I agree to the <span className="text-primary underline">platform contract</span> and <span className="text-primary underline">terms of service</span>.
                </span>
              </Checkbox>
              <InfoBanner>{updated ? `This updated offer expires on ${o.updatedExpires}` : `This offer expires on ${o.expires}`}</InfoBanner>
              {declined ? (
                <Button size="lg" disabled>
                  Offer declined
                </Button>
              ) : accepted ? (
                <Button size="lg" disabled>
                  Accepted
                </Button>
              ) : (
                <>
                  <Button size="lg" variant="primary" disabled={!signed} onClick={() => setAccepted(true)}>
                    Accept
                  </Button>
                  <Button size="lg" onClick={() => setDeclining(true)}>
                    Decline
                  </Button>
                </>
              )}
            </div>
          </Card>
        </div>
      </div>

      <Modal
        open={accepted}
        onClose={() => router.push(back)}
        title="You’ve accepted the offer"
        description={`${o.from} has been notified. Escrow for the trial is funded next; the contract and its tracker appear under Contracts once it starts.`}
        footer={
          <Button
            size="lg"
            variant="primary"
            onClick={() => {
              setStage(app.id, "offer_accepted", { label: "Offer accepted", tone: "ok" });
              router.push("/independent/contracts/sales-manager");
            }}
          >
            Open contract
          </Button>
        }
      />
      <Modal
        open={declining}
        onClose={() => setDeclining(false)}
        tone="danger"
        title="Decline this offer?"
        description="Are you sure you want to decline this offer? The team builder will be notified and this action cannot be undone."
        footer={
          <>
            <Button size="lg" onClick={() => setDeclining(false)}>
              Cancel
            </Button>
            <Button
              size="lg"
              variant="danger"
              onClick={() => {
                setDeclining(false);
                setDeclined(true);
                setStage(app.id, "offer_received", { label: "Offer declined", tone: "danger" });
              }}
            >
              Decline
            </Button>
          </>
        }
      />
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
