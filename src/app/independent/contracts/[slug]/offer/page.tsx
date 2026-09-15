"use client";

import Image from "next/image";
import { notFound, useRouter } from "next/navigation";
import { use, useState } from "react";
import { Button, Card, Checkbox, InfoBanner, Modal, ObjectiveRow, Page, Toast, useToast } from "@/components/independent/ui";
import { AGREEMENT, ME, contracts, marketingSpecialist as job } from "@/lib/independent/data";

/** Figma "Contracts / Offer updated · talent view" — same frame as the offer screen (1080 wide, sections p 24 + 48px dividers). */
export default function ContractOffer({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const contract = contracts.find((c) => c.slug === slug);
  if (!contract) notFound();
  const router = useRouter();
  const back = `/independent/contracts/${contract.slug}`;
  const updated = contract.slug === "sales-manager";
  const [name, setName] = useState(updated ? "" : ME.name);
  const [agree, setAgree] = useState(!updated);
  const [accepted, setAccepted] = useState(!updated);
  const [declining, setDeclining] = useState(false);
  const [toast, setToast] = useToast();
  const o = job.offer;
  const signed = name.trim().length > 2 && agree;

  const rows: [string, string][] = [
    ["Role", contract.title],
    ["Contract type", contract.type === "trial" ? "Trial" : "Full-time"],
    ["Duration", contract.type === "trial" ? "30 Days" : "Ongoing"],
    ["Start date", contract.started],
    ["End date", contract.ends],
    ["Rate", updated ? o.updatedRate : contract.rate],
    ["Payment cadence", contract.type === "trial" ? "One-time" : "Monthly"],
    ["Pay in", contract.type === "trial" ? "End of trial (1 payment)" : "End of each month"],
    ["Total payment at end of trial", updated ? o.updatedTotal : contract.rate.replace(" /month", ".00")],
  ];

  return (
    <Page title="Offer" heading="modal" onClose={() => router.push(back)} padded={false}>
      <div className="mx-auto flex w-[1080px] flex-col gap-10 pt-10 pb-20">
        <div className="flex flex-col gap-2">
          <h2 className="font-display text-[32px] leading-[1.5] font-semibold text-black" style={{ fontVariationSettings: '"opsz" 14' }}>
            {updated ? `Updated offer from ${contract.company}` : `Contract — ${contract.company}`}
          </h2>
          <p className="text-[14px] leading-[1.2] tracking-[0.2px] text-ink-2">
            {updated ? `${contract.company} changed the terms on 9 Sep 2026. Review and sign the new version; the earlier offer no longer applies.` : "Your signed services agreement for this contract."}
          </p>
        </div>
        {updated && <InfoBanner>{o.updatedNote}</InfoBanner>}

        <div className="flex items-start gap-6">
          <Card className="flex min-w-0 flex-1 flex-col overflow-hidden">
            <div className="flex flex-col gap-4 px-6 pt-6 text-ink">
              <h3 className="text-[20px] leading-[1.5] font-semibold tracking-[0.4px]">{contract.title}</h3>
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
                {contract.objectives.map((ob, i) => (
                  <ObjectiveRow key={ob.id} index={i}>
                    {ob.title}
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
                  <p className="text-[16px] leading-[1.5] font-semibold tracking-[0.2px] text-ink">{contract.manager}</p>
                  <p className="text-[14px] leading-[1.2] tracking-[0.2px] text-ink-2">{contract.company}</p>
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
                disabled={accepted}
                className="border-b border-border py-2 font-display text-[20px] text-ink italic outline-none placeholder:text-ink-2 focus:border-primary"
                style={{ fontVariationSettings: '"opsz" 14' }}
              />
              <Checkbox checked={agree} onChange={setAgree} disabled={accepted}>
                <span className="text-[12px] leading-[1.4]">
                  I agree to the <span className="text-primary underline">platform contract</span> and <span className="text-primary underline">terms of service</span>.
                </span>
              </Checkbox>
              {updated ? <InfoBanner>This updated offer expires on {o.updatedExpires}</InfoBanner> : <InfoBanner>Signed {contract.started}. Escrow funded the same day.</InfoBanner>}
              {accepted ? (
                <Button size="lg" disabled>
                  {updated ? "Accepted" : "Signed"}
                </Button>
              ) : (
                <>
                  <Button size="lg" variant="primary" disabled={!signed} onClick={() => { setAccepted(true); setToast("Updated offer accepted"); }}>
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
            <Button size="lg" variant="danger" onClick={() => { setDeclining(false); setToast("Updated offer declined — the 8 Sep terms stay in force"); }}>
              Decline
            </Button>
          </>
        }
      />
      <Toast message={toast} onClose={() => setToast(null)} />
    </Page>
  );
}

function Divider() {
  return (
    <span aria-hidden className="flex h-12 items-center px-6">
      <span className="h-px w-full bg-[#e5e5e5]" />
    </span>
  );
}
