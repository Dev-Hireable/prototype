"use client";

import Image from "next/image";
import { notFound, useRouter } from "next/navigation";
import { use, useState } from "react";
import { Button, Card, Checkbox, Field, InfoBanner, LinkButton, Modal, ObjectiveRow, Page, Textarea } from "@/components/independent/ui";
import { formatDate, fromISODate } from "@/components/portal/DatePicker";
import { kindIndex } from "@/components/team/ObjectiveViews";
import { durationDays, parseDay, trialMonths } from "@/lib/demo/dates";
import { useDeal } from "@/lib/demo/deal";
import { rateAmount, usd } from "@/lib/demo/disputes";
import { PAIR } from "@/lib/demo/live";
import { AGREEMENT } from "@/lib/independent/data";
import { useJobView } from "@/lib/independent/job-view";
import { useDemo } from "@/lib/independent/store";

/** Offer dates are stored yyyy-mm-dd; show them the way every other date reads. */
const pretty = (iso: string) => {
  const d = fromISODate(iso);
  return d ? formatDate(d) : iso;
};

/** Seven days from when it was sent (or last changed) — the window the Team Builder's card counts down. */
function expiryOf(sent: string) {
  const d = parseDay(sent);
  if (!d) return undefined;
  d.setDate(d.getDate() + 7);
  return formatDate(d);
}

/**
 * Figma "Offer · unsigned / · signed / Offer accepted · confirm / Decline offer · modal / Offer updated".
 * Frame: px 140, pt 40, pb 80, gap 40, content 1080 wide; sections p 24 separated by 48px dividers.
 *
 * Everything on it is the offer the Team Builder sent: the terms, the escrow funded for them, their
 * name and photo. It used to take the cadence and "Pay in" rows, the updated-offer copy and the
 * sender's photo (the talent's own) from a seed sample.
 */
export default function Offer({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { applications, setStage, declineOffer } = useDemo();
  const app = applications.find((a) => a.id === id);
  const router = useRouter();
  const deal = useDeal();
  const job = useJobView(app ?? { id, roleSlug: "", title: "", company: "", match: 0, submitted: "", stage: "applied" });
  const [name, setName] = useState("");
  const [agree, setAgree] = useState(false);
  /** Shows the confirmation; the acceptance itself is already saved by the time it opens. */
  const [justAccepted, setJustAccepted] = useState(false);
  const [declining, setDeclining] = useState(false);
  const [declineReason, setDeclineReason] = useState("");
  const sent = app && deal?.roleSlug === app.roleSlug ? deal.offer : undefined;
  if (!app || !sent) notFound();
  const back = `/independent/jobs/applications/${app.id}`;
  const from = job.company;
  const contact = PAIR.team.name;
  // Read back from the shared engagement, so an answer given earlier still shows after a reload.
  const accepted = sent.status === "accepted";
  const declined = sent.status === "declined";
  const withdrawn = sent.status === "withdrawn";
  const updated = !!sent.updated && sent.status === "sent";
  const months = trialMonths(durationDays(job.duration));
  /** The whole trial is paid from the escrow funded with the offer. */
  const total = sent.deposit?.escrow ?? rateAmount(sent.rate) * months;
  const expires = expiryOf(sent.updated ?? sent.sent);
  const signed = name.trim().length > 2 && agree;

  const rows: [string, string][] = [
    ["Role", job.title],
    ["Contract type", job.contract],
    ["Duration", job.duration],
    ["Start date", pretty(sent.start)],
    ["End date", pretty(sent.end)],
    ["Rate", `${sent.rate}`],
    ["Payment", "Held in escrow, released at the end of the trial"],
    ["Total payment at end of trial", usd(total)],
  ];

  return (
    <Page title="Offer" heading="modal" onClose={() => router.push(back)} padded={false}>
      <div className="mx-auto flex w-[1080px] flex-col gap-10 pt-10 pb-20">
        <div className="flex flex-col gap-2">
          <h2 className="font-display text-[32px] leading-[1.5] font-semibold text-black" style={{ fontVariationSettings: '"opsz" 14' }}>
            {updated ? `Updated offer from ${from}` : `Offer from ${from}`}
          </h2>
          <p className="text-[14px] leading-[1.2] tracking-[0.2px] text-ink-2">
            {updated ? `${from} changed the terms on ${sent.updated}. Review and sign the new version; the earlier offer no longer applies.` : "Review the full proposal, sign the contract, and confirm your offer"}
          </p>
        </div>
        {withdrawn && <InfoBanner tone="warn">{from} withdrew this offer, so it can no longer be accepted. Your proposal is still with them.</InfoBanner>}

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
                {sent.objectives.map((ob) => (
                  <ObjectiveRow key={ob.id} index={kindIndex(ob.kind)}>
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
                <Image src={PAIR.team.avatar} alt="" width={88} height={88} className="size-11 rounded-full object-cover" />
                <div>
                  <p className="text-[16px] leading-[1.5] font-semibold tracking-[0.2px] text-ink">{contact}</p>
                  <p className="text-[14px] leading-[1.2] tracking-[0.2px] text-ink-2">{from}</p>
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
                disabled={accepted || declined || withdrawn}
                className="border-b border-border py-2 font-display text-[20px] text-ink italic outline-none placeholder:text-ink-2 focus:border-primary"
                style={{ fontVariationSettings: '"opsz" 14' }}
              />
              <Checkbox checked={agree} onChange={setAgree} disabled={accepted || declined || withdrawn}>
                <span className="text-[12px] leading-[1.4]">
                  I agree to the <span className="text-primary underline">platform contract</span> and <span className="text-primary underline">terms of service</span>.
                </span>
              </Checkbox>
              {!accepted && !declined && !withdrawn && expires && <InfoBanner>{updated ? `This updated offer expires on ${expires}` : `This offer expires on ${expires}`}</InfoBanner>}
              {declined ? (
                <Button size="lg" disabled>
                  Offer declined
                </Button>
              ) : withdrawn ? (
                <Button size="lg" disabled>
                  Offer withdrawn
                </Button>
              ) : accepted ? (
                <>
                  <Button size="lg" disabled>
                    Accepted
                  </Button>
                  <LinkButton size="lg" href={`/independent/contracts/${app.roleSlug}`}>
                    Open contract
                  </LinkButton>
                </>
              ) : (
                <>
                  <Button
                    size="lg"
                    variant="primary"
                    disabled={!signed}
                    onClick={() => {
                      // IN-074 — accepting is saved on the click; the confirmation only reports it.
                      setStage(app.id, "hired", { label: "Waiting to start", tone: "ok" });
                      setJustAccepted(true);
                    }}
                  >
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
        open={justAccepted}
        onClose={() => router.push(back)}
        title="You’ve accepted the offer"
        description={`${from} has been notified. The ${usd(total)} escrow they funded is held for the trial, and the contract and its tracker are under Contracts.`}
        footer={
          <Button size="lg" variant="primary" onClick={() => router.push(`/independent/contracts/${app.roleSlug}`)}>
            Open contract
          </Button>
        }
      />
      <Modal
        open={declining}
        onClose={() => setDeclining(false)}
        tone="danger"
        title="Decline this offer?"
        description={`${contact} is told you have declined, with your reason if you give one. The offer stays in My Applications so you can look back at the terms, but you cannot accept it afterwards.`}
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
                // IN-075 — the reason reaches the Team Builder; it used to be dropped here.
                declineOffer(app.id, declineReason);
              }}
            >
              Decline
            </Button>
          </>
        }
      >
        {/* IN-075 — a reason is optional; declining without one is fine. */}
        <Field label="Reason (optional)">
          <Textarea rows={3} value={declineReason} onChange={(e) => setDeclineReason(e.target.value)} placeholder="Anything you want the Team Builder to know — rate, timing, or scope." />
        </Field>
      </Modal>
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
