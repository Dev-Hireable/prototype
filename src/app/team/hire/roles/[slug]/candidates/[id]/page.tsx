"use client";

import Link from "next/link";
import { notFound, useRouter } from "next/navigation";
import { use, useState } from "react";
import { MdChevronLeft, MdOutlineFlag } from "react-icons/md";
import { Button, Field, Input, JobBadge, KeyValue, LinkButton, Modal, ObjectiveRow, Page, PipelineTracker, Select, Tabs, Textarea, Toast, useToast } from "@/components/independent/ui";
import { IntroCard, ProfileColumn } from "@/components/team/ui";
import { EMPLOYER_STAGE_LABELS, byName } from "@/lib/team/data";
import { useDemo } from "@/lib/team/store";

const PROPOSAL = { rate: "$1,500.00/mo", objectives: ["Drive Qualified Pipeline Through Outreach", "Increase Click-Through Rate", "Deliver Client-Ready Brand Awareness Campaign Assets"], letter: "I am a results-driven specialist with over 5 years of experience in digital marketing, brand awareness, and campaign management. My approach combines data-driven strategy with creative execution to deliver measurable results." };

type Dialog = null | "invite" | "drop" | "flag" | "request" | "proposal" | "decline" | "revision" | "offer";

/**
 * Figma "Candidate tracker / Candidate profile · matched … Hired": role header with tabs, "Back to pipeline",
 * left column 384 (intro video, two CTAs, pipeline tracker, flag) + right column 512 (profile, rate, work style, skills, history).
 */
export default function CandidateTracker({ params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = use(params);
  const router = useRouter();
  const { roles, candidates, setStage, setDropped, setOffer } = useDemo();
  const role = roles.find((r) => r.slug === slug);
  const cand = candidates.find((c) => c.id === id);
  if (!role || !cand) notFound();
  const p = byName(cand.independent);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [link, setLink] = useState("https://meet.google.com/yxw-vuts-rqp");
  const [rate, setRate] = useState("1,600");
  const [toast, setToast] = useToast();
  const first = p.name.split(" ")[0];
  const declined = cand.status?.label === "Declined to propose";
  const [when = "01/06/2026", at = "06:00 AM (EST)"] = (cand.status?.meta ?? "").split(" · ");
  const pipeline = `/team/hire/roles/${role.slug}`;

  const sendInvite = () => {
    if (!date || !time) return;
    setStage(cand.id, "invited", { label: "Awaiting reply", tone: "neutral", meta: `${date} · ${time}` });
    setDialog(null);
    setToast(`Interview invitation sent to ${first}`);
  };

  /** CTA pair per Figma frame (primary, secondary). */
  const cta = (() => {
    const message = <LinkButton size="lg" href="/team/messages" className="w-full">Message</LinkButton>;
    const request = (
      <Button size="lg" variant="primary" className="w-full" onClick={() => setDialog("request")}>
        Request proposal
      </Button>
    );
    if (cand.dropped)
      return (
        <>
          <Button size="lg" variant="primary" className="w-full" onClick={() => setDialog("drop")}>
            Undrop candidate
          </Button>
          <LinkButton size="lg" href={pipeline} className="w-full">
            Back to pipeline
          </LinkButton>
        </>
      );
    if (declined)
      return (
        <>
          <LinkButton size="lg" variant="primary" href={pipeline} className="w-full">
            Back to pipeline
          </LinkButton>
          <LinkButton size="lg" href="/team/discover" className="w-full">
            Browse candidates
          </LinkButton>
        </>
      );
    switch (cand.stage) {
      case "applied":
      case "matched":
        return (
          <>
            {request}
            <Button size="lg" className="w-full" onClick={() => setDialog("invite")}>
              Invite to interview
            </Button>
          </>
        );
      case "invited":
      case "invite_accepted":
      case "interviewed":
        return (
          <>
            {request}
            {message}
          </>
        );
      case "proposal_requested":
        return (
          <>
            <Button size="lg" variant="primary" className="w-full" disabled>
              Review proposal
            </Button>
            {message}
          </>
        );
      case "proposal_sent":
        return (
          <>
            <Button size="lg" variant="primary" className="w-full" onClick={() => setDialog("proposal")}>
              Review proposal
            </Button>
            {message}
          </>
        );
      case "offer_received":
      case "offer_accepted":
        return (
          <>
            <LinkButton size="lg" variant="primary" href="/team/hire/offers" className="w-full">
              Track offer
            </LinkButton>
            {message}
          </>
        );
      default:
        return (
          <>
            <LinkButton size="lg" variant="primary" href={`/team/independents/${p.slug}`} className="w-full">
              Track trial progress
            </LinkButton>
            {message}
          </>
        );
    }
  })();

  return (
    <Page
     
      title={
        <>
          {role.title} <JobBadge type={role.type} />
        </>
      }
      tabs={
        <Tabs
          className="px-4"
          value="interested"
          onChange={(v) => v === "details" && router.push(`${pipeline}?tab=details`)}
          options={[
            { value: "interested", label: "Interested" },
            { value: "details", label: "Role details" },
          ]}
        />
      }
    >
      <div className="flex flex-col gap-10 pb-14">
        <Link href={pipeline} className="flex h-5 items-center gap-1 text-[14px] leading-[1.2] tracking-[0.2px] text-ink">
          <MdChevronLeft size={16} aria-hidden /> Back to pipeline
        </Link>
        <div className="flex items-start justify-center gap-6">
          {/* Left column */}
          <div className="flex w-[384px] shrink-0 flex-col gap-4">
            <IntroCard person={p} onPlay={() => setToast("Intro video plays here")} />
            <div className="flex flex-col gap-2">{cta}</div>
            {(cand.stage === "invited" || cand.stage === "invite_accepted") && !cand.dropped && (
              <dl className="flex flex-col gap-4 text-[14px] leading-[1.2] tracking-[0.2px] text-ink">
                <div className="flex flex-col gap-2">
                  <dt className="font-semibold">Date:</dt>
                  <dd>{when}</dd>
                </div>
                <div className="flex flex-col gap-2">
                  <dt className="font-semibold">Time:</dt>
                  <dd>{at}</dd>
                </div>
                <div className="flex flex-col gap-2">
                  <dt className="font-semibold">Meeting link</dt>
                  <dd className="flex h-11 items-center truncate rounded-lg bg-[#e5e5e5] px-4 text-ink-2 outline -outline-offset-1 outline-border">{link}</dd>
                </div>
                <button type="button" onClick={() => { navigator.clipboard?.writeText(link); setToast("Meeting link copied"); }} className="flex items-center gap-1 self-start font-medium text-accent-ink">
                  Copy link
                </button>
              </dl>
            )}
            <PipelineTracker stage={cand.stage} labels={EMPLOYER_STAGE_LABELS} />
            <div className="flex items-center gap-4 text-[14px] leading-[1.2] tracking-[0.2px] font-medium">
              <button type="button" onClick={() => setDialog("flag")} className="flex items-center gap-2 text-accent-ink">
                <MdOutlineFlag size={20} aria-hidden /> Flag candidate
              </button>
              {!cand.dropped && (
                <button type="button" onClick={() => setDialog("drop")} className="text-danger">
                  Drop candidate
                </button>
              )}
            </div>
          </div>

          <ProfileColumn person={p} />
        </div>
      </div>

      {/* Invite to interview — Figma "Interviews / Invite to interview · empty / error / filled / confirm" */}
      <Modal
        open={dialog === "invite"}
        onClose={() => setDialog(null)}
        title={`Invite ${first} to interview`}
        description="Pick a slot from your availability. They get the invite by email and in-app and can accept or ask to reschedule."
        footer={
          <>
            <Button size="lg" onClick={() => setDialog(null)}>
              Cancel
            </Button>
            <Button size="lg" variant="primary" disabled={!date || !time} onClick={sendInvite}>
              Send invitation
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <div className="flex gap-3">
            <Field label="Date" className="flex-1" hint={!date ? "Required" : undefined}>
              <Input value={date} onChange={(e) => setDate(e.target.value)} placeholder="01/06/2026" />
            </Field>
            <Field label="Time" className="flex-1">
              <Select options={["", "06:00 AM (EST)", "09:30 AM (EST)", "02:00 PM (EST)"]} value={time} onChange={(e) => setTime(e.target.value)} />
            </Field>
          </div>
          <Field label="Meeting link">
            <Input value={link} onChange={(e) => setLink(e.target.value)} />
          </Field>
          <Field label="Note (optional)">
            <Textarea rows={3} className="h-[78px]" placeholder="Anything they should prepare" />
          </Field>
        </div>
      </Modal>

      <Modal
        open={dialog === "drop"}
        onClose={() => setDialog(null)}
        tone={cand.dropped ? "default" : "danger"}
        title={cand.dropped ? `Undrop ${first}?` : `Drop ${first} from this role?`}
        description={cand.dropped ? "They return to their previous stage in the tracker and are told the role is open to them again." : "They are told the role moved on without them. You can undrop within 30 days; after that the application is closed."}
        footer={
          <>
            <Button size="lg" onClick={() => setDialog(null)}>
              Cancel
            </Button>
            <Button size="lg" variant={cand.dropped ? "primary" : "danger"} onClick={() => { setDropped(cand.id, !cand.dropped); setDialog(null); setToast(cand.dropped ? "Candidate restored" : "Candidate dropped"); }}>
              {cand.dropped ? "Undrop candidate" : "Drop candidate"}
            </Button>
          </>
        }
      />

      <Modal
        open={dialog === "flag"}
        onClose={() => setDialog(null)}
        title={`Flag ${p.name}`}
        description="Hireable reviews flags within 2 working days. The candidate is not told who flagged them."
        footer={
          <>
            <Button size="lg" onClick={() => setDialog(null)}>
              Cancel
            </Button>
            <Button size="lg" variant="primary" onClick={() => { setDialog(null); setToast("Thanks — our team will review this candidate"); }}>
              Send flag
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <Field label="Reason">
            <Select options={["Misrepresented experience", "No-show to interview", "Inappropriate conduct", "Other"]} />
          </Field>
          <Field label="Details">
            <Textarea rows={3} className="h-[78px]" placeholder="What happened?" />
          </Field>
        </div>
      </Modal>

      <Modal
        open={dialog === "request"}
        onClose={() => setDialog(null)}
        title={`Request a proposal from ${first}`}
        description="They see the trial objectives and expectation, then propose a rate and cover letter. You can accept, request a revision or decline."
        footer={
          <>
            <Button size="lg" onClick={() => setDialog(null)}>
              Cancel
            </Button>
            <Button size="lg" variant="primary" onClick={() => { setStage(cand.id, "proposal_requested", { label: "Proposal requested", tone: "neutral", meta: "Sent today" }); setDialog(null); setToast(`Proposal requested from ${first}`); }}>
              Send request
            </Button>
          </>
        }
      >
        <Field label="Note (optional)">
          <Textarea rows={3} className="h-[78px]" placeholder="Anything to add to the trial expectation" />
        </Field>
      </Modal>

      {/* Review proposal — Figma "Proposals and offers / Review proposal · objectives" */}
      <Modal
        open={dialog === "proposal"}
        onClose={() => setDialog(null)}
        title="Proposal v1"
        description={`${first}’s proposal for ${role.title}. Send an offer, ask for a revision, or decline.`}
        footer={
          <>
            <Button size="lg" variant="ghost" onClick={() => setDialog("decline")}>
              Decline
            </Button>
            <Button size="lg" onClick={() => setDialog("revision")}>
              Request revision
            </Button>
            <Button size="lg" variant="primary" onClick={() => setDialog("offer")}>
              Send offer
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <div className="flex gap-2">
            <KeyValue label="Rate" value={PROPOSAL.rate} />
            <KeyValue label="Contract" value={role.type === "trial" ? "Trial" : "Full-time"} />
            <KeyValue label="Duration" value={role.duration} />
          </div>
          <div className="flex flex-col gap-2">
            {PROPOSAL.objectives.map((o, i) => (
              <ObjectiveRow key={o} index={i}>
                {o}
              </ObjectiveRow>
            ))}
          </div>
          <p className="text-[14px] leading-[1.2] tracking-[0.2px] text-ink-2">{PROPOSAL.letter}</p>
        </div>
      </Modal>

      <Modal
        open={dialog === "revision"}
        onClose={() => setDialog(null)}
        title="Request a revision"
        description={`${first} gets your note and can resubmit. The current version stays in the history.`}
        footer={
          <>
            <Button size="lg" onClick={() => setDialog(null)}>
              Cancel
            </Button>
            <Button size="lg" variant="primary" onClick={() => { setStage(cand.id, "proposal_requested", { label: "Revision requested", tone: "warn", meta: "v1 · today" }); setDialog(null); setToast("Revision requested"); }}>
              Send request
            </Button>
          </>
        }
      >
        <Field label="What should change?">
          <Textarea rows={3} className="h-[78px]" placeholder="e.g. Please update the lead generation target from 50 to 75." />
        </Field>
      </Modal>

      <Modal
        open={dialog === "decline"}
        onClose={() => setDialog(null)}
        tone="danger"
        title="Decline this proposal?"
        description={`${first} is told the proposal was declined. They stay in the tracker so you can request a new one later.`}
        footer={
          <>
            <Button size="lg" onClick={() => setDialog(null)}>
              Cancel
            </Button>
            <Button size="lg" variant="danger" onClick={() => { setStage(cand.id, "interviewed", { label: "Proposal declined", tone: "danger" }); setDialog(null); setToast("Proposal declined"); }}>
              Decline proposal
            </Button>
          </>
        }
      >
        <Field label="Reason">
          <Select options={["Rate above budget", "Objectives not aligned", "Chose another candidate", "Other"]} />
        </Field>
      </Modal>

      {/* Send offer — Figma "Proposals and offers / Send offer · unsigned / dates / cadence / Offer sent confirm" */}
      <Modal
        open={dialog === "offer"}
        onClose={() => setDialog(null)}
        title={`Send an offer to ${first}`}
        description="Escrow for the trial is charged to your default payment method once they accept. The offer expires in 7 days."
        footer={
          <>
            <Button size="lg" onClick={() => setDialog(null)}>
              Cancel
            </Button>
            <Button size="lg" variant="primary" onClick={() => { setStage(cand.id, "offer_received", { label: "Offer sent", tone: "warn", meta: "Expires in 7 days" }); setOffer("o1", { status: { label: "Pending", tone: "warn" } }); setDialog(null); setToast(`Offer sent to ${first}`); }}>
              Send offer
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <div className="flex gap-3">
            <Field label="Rate (USD / month)" className="flex-1">
              <Input value={rate} onChange={(e) => setRate(e.target.value)} inputMode="numeric" />
            </Field>
            <Field label="Payment cadence" className="flex-1">
              <Select options={["One-time at end of trial", "Every 2 weeks", "Monthly"]} />
            </Field>
          </div>
          <div className="flex gap-3">
            <Field label="Start date" className="flex-1">
              <Input placeholder="1 Oct 2026" />
            </Field>
            <Field label="End date" className="flex-1">
              <Input placeholder="30 Oct 2026" />
            </Field>
          </div>
        </div>
      </Modal>
      <Toast message={toast} onClose={() => setToast(null)} />
    </Page>
  );
}

