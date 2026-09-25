"use client";

import Image from "next/image";
import { notFound, useRouter } from "next/navigation";
import { use, useState } from "react";
import { Button, Card, Checkbox, Field, InfoBanner, LinkButton, Modal, Page, StatusDot, Textarea, Toast, useToast } from "@/components/independent/ui";
import { formatDate, fromISODate } from "@/components/portal/DatePicker";
import { useDeal } from "@/lib/demo/deal";
import { escrowOf, usd, useDisputes } from "@/lib/demo/disputes";
import { hoursLabel, JOB_TYPE_LABEL } from "@/lib/demo/job-types";
import { PAIR } from "@/lib/demo/live";
import { agreementFor } from "@/lib/independent/data";
import { useDemo } from "@/lib/independent/store";
import { FT_BENEFITS } from "@/lib/team/data";

const pretty = (iso: string) => {
  const d = fromISODate(iso);
  return d ? formatDate(d) : iso;
};

/**
 * TB-072 / IN-084 — the offer that follows an evaluated trial, for a full-time role (salary, start
 * date and the benefits the Team Builder picked) or a part-time one (monthly rate, hours a week and
 * start date), signed or declined here.
 */
export default function ContractOffer({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const { contracts, acceptConversion, declineConversion } = useDemo();
  const deal = useDeal();
  const disputes = useDisputes();
  const router = useRouter();
  const [name, setName] = useState("");
  const [agree, setAgree] = useState(false);
  const [declining, setDeclining] = useState(false);
  const [reason, setReason] = useState("");
  const [toast, setToast] = useToast();
  const contract = contracts.find((c) => c.slug === slug);
  const offer = deal?.roleSlug === slug ? deal.conversion : undefined;
  if (!contract || !offer) notFound();
  const back = `/independent/contracts/${contract.slug}`;
  const open = offer.status === "sent";
  const signed = name.trim().length > 2 && agree;
  /** What accepting releases — nothing once the trial was ended and settled, less while a dispute holds part of it. */
  const escrow = escrowOf(deal, disputes);
  const releasing = escrow ? Math.max(0, escrow.held - escrow.onHold) : 0;

  const kind = JOB_TYPE_LABEL[offer.type];
  const rows: [string, React.ReactNode][] = [
    ["Role", contract.title],
    ["Contract type", kind],
    ["Start date", pretty(offer.start)],
    [offer.type === "full-time" ? "Salary" : "Rate", `${offer.salary} /month`],
    ...(offer.type === "part-time" ? ([["Hours", hoursLabel(offer.hours)]] as [string, React.ReactNode][]) : []),
    ["Payment", "Monthly, at the end of each month"],
    ["Review", "Quarterly, with evaluations as the work goes on"],
  ];

  return (
    <Page title={`${kind} offer`} heading="modal" onClose={() => router.push(back)} padded={false}>
      <div className="mx-auto flex w-[1080px] flex-col gap-10 pt-10 pb-20">
        <div className="flex flex-col gap-2">
          <h2 className="font-display text-[32px] leading-[1.5] font-semibold text-black" style={{ fontVariationSettings: '"opsz" 14' }}>
            {kind} offer from {contract.company}
          </h2>
          <p className="text-[14px] leading-[1.2] tracking-[0.2px] text-ink-2">Sent {offer.sent}. Accepting turns your trial into a {kind.toLowerCase()} engagement{releasing > 0 ? `, and the ${usd(releasing)} still in the trial's escrow is released to you` : ""}.</p>
        </div>
        {offer.status === "withdrawn" && <InfoBanner tone="warn">{deal?.contract?.ended ? `${contract.company} ended the contract, so this offer was withdrawn and can no longer be accepted.` : `${contract.company} withdrew this offer, so it can no longer be accepted.`}</InfoBanner>}

        <div className="flex items-start gap-6">
          <Card className="flex min-w-0 flex-1 flex-col gap-6 p-6">
            <div className="flex flex-col gap-4">
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
            {offer.type === "full-time" && (
            <div className="flex flex-col gap-3">
              <h3 className="text-[16px] leading-[1.5] font-semibold tracking-[0.2px] text-ink">Exclusive benefits</h3>
              <ul className="flex flex-col gap-2 text-[14px] leading-[1.4]">
                {FT_BENEFITS.map((b) => (
                  <li key={b} className="flex items-center justify-between gap-4">
                    <span className="text-ink">{b}</span>
                    <StatusDot tone={offer.benefits.includes(b) ? "ok" : "neutral"}>{offer.benefits.includes(b) ? "Included" : "Not included"}</StatusDot>
                  </li>
                ))}
              </ul>
            </div>
            )}
            <div className="flex flex-col gap-3">
              <h3 className="text-[16px] leading-[1.5] font-semibold tracking-[0.2px] text-ink">Services Agreement</h3>
              <div className="flex h-[260px] flex-col gap-6 overflow-y-auto rounded-lg bg-surface-2 px-4 pt-4 outline -outline-offset-1 outline-border">
                <p className="pb-4 text-[14px] leading-[1.2] tracking-[0.2px] whitespace-pre-line text-ink-2">{agreementFor(offer.type)}</p>
              </div>
            </div>
          </Card>

          <Card className="flex w-[360px] shrink-0 flex-col divide-y divide-[#e5e5e5]">
            <div className="flex flex-col gap-4 p-6">
              <h3 className="text-[16px] leading-[1.5] font-semibold tracking-[0.2px] text-ink">Offer from</h3>
              <div className="flex items-center gap-3">
                <Image src={PAIR.team.avatar} alt="" width={88} height={88} className="size-11 rounded-full object-cover" />
                <div>
                  <p className="text-[16px] leading-[1.5] font-semibold tracking-[0.2px] text-ink">{contract.manager}</p>
                  <p className="text-[14px] leading-[1.2] tracking-[0.2px] text-ink-2">{contract.company}</p>
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-4 p-6">
              <h3 className="text-[16px] leading-[1.5] font-semibold tracking-[0.2px] text-ink">Sign contract</h3>
              {open ? (
                <>
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
                  <Button
                    size="lg"
                    variant="primary"
                    disabled={!signed}
                    onClick={() => {
                      acceptConversion();
                      setToast(`You're ${kind.toLowerCase()} with ${contract.company}`);
                    }}
                  >
                    Accept
                  </Button>
                  <Button size="lg" variant="danger" onClick={() => setDeclining(true)}>
                    Decline
                  </Button>
                </>
              ) : (
                <>
                  <Button size="lg" disabled>
                    {offer.status === "accepted" ? "Accepted" : offer.status === "declined" ? "Declined" : "Withdrawn"}
                  </Button>
                  {offer.status === "declined" && offer.declineReason && <p className="text-[13px] leading-[1.4] text-ink-2">Your reason: “{offer.declineReason}”</p>}
                  <LinkButton size="lg" href={back}>
                    Open contract
                  </LinkButton>
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
        title={`Decline the ${kind.toLowerCase()} offer?`}
        description={`${contract.manager} is told, with your reason if you give one. Your trial record stays on the contract.`}
        footer={
          <>
            <Button size="lg" onClick={() => setDeclining(false)}>
              Cancel
            </Button>
            <Button
              size="lg"
              variant="danger"
              onClick={() => {
                declineConversion(reason);
                setDeclining(false);
                setToast(`${kind} offer declined`);
              }}
            >
              Decline
            </Button>
          </>
        }
      >
        <Field label="Reason (optional)">
          <Textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Pay, hours, start date, or anything else they should know." />
        </Field>
      </Modal>
      <Toast message={toast} onClose={() => setToast(null)} />
    </Page>
  );
}
