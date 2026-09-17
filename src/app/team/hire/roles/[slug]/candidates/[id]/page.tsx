"use client";

import { notFound, useRouter } from "next/navigation";
import { use, useState } from "react";
import { MdOutlineFlag, MdOutlineThumbDown } from "react-icons/md";
import { BackLink, Button, Field, Input, JobBadge, LinkButton, Modal, Page, PipelineTracker, Select, Tabs, Textarea, Toast, useToast } from "@/components/independent/ui";
import { IntroCard, ProfileColumn } from "@/components/team/ui";
import { SendOfferDialog } from "@/components/team/SendOfferDialog";
import { ProposalReview } from "@/components/team/ProposalReview";
import type { Proposal } from "@/components/team/ProposalReview";
import { EMPLOYER_STAGE_LABELS, byName } from "@/lib/team/data";
import { useDemo } from "@/lib/team/store";

/** Figma node 11338-10129 — the proposal as submitted, with each objective's key results. */
const PROPOSAL: Proposal = {
  version: 1,
  sent: "7 Sep 2026",
  rate: "$1,500.00/mo",
  letter:
    "I am a results-driven specialist with over 5 years of experience in digital marketing, brand awareness, and campaign management. My approach combines data-driven strategy with creative execution to deliver measurable results.",
  objectives: [
    {
      title: "Drive Qualified Pipeline Through Outreach",
      kind: "okr",
      description: "Demonstrate the ability to identify, engage, and convert qualified prospects through a structured outreach process — proving readiness for a full-time marketing role.",
      keyResults: [
        { title: "Send Targeted Outreach Messages", description: "Reach out to at least 500 qualified prospects through email or LinkedIn to build a consistent top-of-funnel pipeline.", target: "500" },
        { title: "Book Discovery Calls", description: "Convert outreach into at least 12 booked discovery calls with decision makers in the target segment.", target: "12" },
        { title: "Build Outreach Playbook", description: "Document the sequences, templates and objection handling that worked, so the next rep can run it.", target: "1 playbook" },
      ],
    },
    {
      title: "Increase Click-Through Rate",
      kind: "kpi",
      description: "Lift email and paid click-through rates against the current baseline by testing subject lines, creative and audience segments each week.",
      keyResults: [
        { title: "Raise email CTR from 2.1% to 4%", description: "Run a weekly A/B test on subject line and preview text, keeping the winning variant each cycle.", target: "4%" },
        { title: "Report on every test", description: "A short weekly note on what was tested, what won, and what happens next.", target: "Weekly" },
      ],
    },
    {
      title: "Deliver Client-Ready Brand Awareness Campaign Assets",
      kind: "task",
      description: "Produce a complete campaign pack the team can ship without rework: copy, creative and a one-page results summary.",
      keyResults: [{ title: "Hand over the campaign pack", description: "Copy, creative and the results summary in the shared drive, reviewed and signed off.", target: "1 pack" }],
    },
  ],
};

const ThumbDown = MdOutlineThumbDown;

type Dialog = null | "invite" | "drop" | "flag" | "request" | "proposal" | "decline" | "revision" | "offer";

/**
 * Figma "Candidate tracker / Candidate profile · matched … Hired": role header with tabs, "Back to pipeline",
 * left column 384 (intro video, two CTAs, pipeline tracker, flag) + right column 512 (profile, rate, work style, skills, history).
 */
export default function CandidateTracker({ params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = use(params);
  const router = useRouter();
  const { roles, candidates, setStage, setDropped, sendOffer, cards, addInterview } = useDemo();
  const role = roles.find((r) => r.slug === slug);
  const cand = candidates.find((c) => c.id === id);
  if (!role || !cand) notFound();
  const p = byName(cand.independent);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [link, setLink] = useState("https://meet.google.com/yxw-vuts-rqp");
  /** TB-106 — the revision note is required before the request can be sent. */
  const [revisionNote, setRevisionNote] = useState("");
  const [toast, setToast] = useToast();
  const first = p.name.split(" ")[0];
  const declined = cand.status?.label === "Declined to propose";
  /** TB-106 — a revision was requested and the independent hasn't resubmitted yet. */
  const awaitingRevision = cand.status?.label === "Revision requested";
  const [when = "01/06/2026", at = "06:00 AM (EST)"] = (cand.status?.meta ?? "").split(" · ");
  const pipeline = `/team/hire/roles/${role.slug}`;

  const sendInvite = () => {
    if (!date || !time) return;
    setStage(cand.id, "invited", { label: "Awaiting reply", tone: "neutral", meta: `${date} · ${time}` });
    // TB-040 — the invitation is also an interview, so it belongs on the Interviews page.
    addInterview({
      id: `iv${Date.now()}`,
      independent: cand.independent,
      role: role.title,
      when: `${date}, ${time}`,
      format: link.includes("zoom") ? "Zoom" : "Google Meet",
      status: { label: "Awaiting reply", tone: "neutral" },
    });
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
            {/* TB-106 — once a revision has been asked for there is a submitted proposal to track,
                so the button stays live and opens it read-only. Before the first submission there
                is nothing to open, and it stays disabled. */}
            <Button size="lg" variant="primary" className="w-full" disabled={!awaitingRevision} onClick={() => setDialog("proposal")}>
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
      nav={<BackLink href={pipeline}>Back to pipeline</BackLink>}
    >
      <div className="flex flex-col gap-10 pb-14">
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
            <PipelineTracker stage={cand.stage} labels={EMPLOYER_STAGE_LABELS} mode="milestone" />
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
        // TB-044 is explicit that neither dropping nor undropping notifies them, so the copy can't imply it does.
        description={cand.dropped ? "They return to their previous stage in the tracker. They are not notified either way." : "They move to the Dropped column and are not notified. You can undrop within 30 days; after that the application is closed."}
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
            <Button size="lg" variant="primary" onClick={() => { setStage(cand.id, "proposal_requested", { label: "Awaiting proposal", tone: "warn", meta: "Sent today" }); setDialog(null); setToast(`Proposal requested from ${first}`); }}>
              Send request
            </Button>
          </>
        }
      >
        <Field label="Note (optional)">
          <Textarea rows={3} className="h-[78px]" placeholder="Anything to add to the trial expectation" />
        </Field>
      </Modal>

      {/* Review proposal — Figma node 11338-10290: the dialog owns its header, panes and action bar. */}
      <Modal open={dialog === "proposal"} onClose={() => setDialog(null)} title={`${first}'s proposal for ${role.title}`} width={1100} bare>
        <ProposalReview
          person={p}
          role={role}
          proposal={PROPOSAL}
          onClose={() => setDialog(null)}
          actions={
            <>
              <Button size="xl" variant="primary" className="w-[280px]" disabled={awaitingRevision} onClick={() => setDialog("offer")}>
                Send offer
              </Button>
              {/* Only one revision request per round — asking again is what the resubmission is for. */}
              <Button size="xl" className="w-[280px]" disabled={awaitingRevision} onClick={() => setDialog("revision")}>
                Request revision
              </Button>
              <Button size="xl" className="!px-0 w-12" disabled={awaitingRevision} onClick={() => setDialog("decline")}>
                <ThumbDown size={20} aria-hidden />
                <span className="sr-only">Decline proposal</span>
              </Button>
            </>
          }
        />
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
            <Button
              size="lg"
              variant="primary"
              disabled={!revisionNote.trim()}
              onClick={() => {
                // Revision and a first request land on the same stage, so the notification is
                // named explicitly rather than inferred from it (TB-106 vs TB-103).
                setStage(cand.id, "proposal_requested", { label: "Revision requested", tone: "warn", meta: "v1 · today" }, "proposal_revision");
                setRevisionNote("");
                setDialog(null);
                setToast("Revision requested");
              }}
            >
              Send request
            </Button>
          </>
        }
      >
        {/* TB-106: feedback is mandatory — "please revise" with no note isn't actionable. */}
        <Field label="What should change?">
          <Textarea rows={3} className="h-[78px]" value={revisionNote} onChange={(e) => setRevisionNote(e.target.value)} placeholder="e.g. Please update the lead generation target from 50 to 75." />
        </Field>
      </Modal>

      <Modal
        open={dialog === "decline"}
        onClose={() => setDialog(null)}
        tone="danger"
        title="Decline this proposal?"
        description={`${first} is told the proposal was declined and moves to the Dropped column. You can undrop them later if things change.`}
        footer={
          <>
            <Button size="lg" onClick={() => setDialog(null)}>
              Cancel
            </Button>
            <Button
              size="lg"
              variant="danger"
              onClick={() => {
                // TB-107: a declined proposal belongs in Dropped, not back in the interview
                // column where it looked like they were still in the running.
                setStage(cand.id, cand.stage, { label: "Proposal declined", tone: "danger" }, "proposal_declined");
                setDropped(cand.id, true);
                setDialog(null);
                setToast("Proposal declined");
              }}
            >
              Decline proposal
            </Button>
          </>
        }
      >
        <Field label="Reason">
          <Select options={["Rate above budget", "Objectives not aligned", "Chose another candidate", "Other"]} />
        </Field>
      </Modal>

      {/* TB-105 — four-step send offer: letter → dates → deposit → sign. */}
      <SendOfferDialog
        open={dialog === "offer"}
        onClose={() => setDialog(null)}
        person={p}
        role={role}
        proposal={PROPOSAL}
        card={cards.find((c) => c.isDefault) ?? cards[0]}
        onSend={(terms) => {
          // TB-105 — the terms and the committed objectives travel with the offer, so the talent
          // signs the same thing the tracker is built from.
          sendOffer({
            rate: PROPOSAL.rate,
            start: terms.start,
            end: terms.end,
            objectives: PROPOSAL.objectives.map((o, i) => ({ id: `obj-${i + 1}`, title: o.title, kind: o.kind })),
          });
          setStage(cand.id, "offer_received", { label: "Awaiting response", tone: "warn", meta: "Expires in 7 days" });
          setToast("Offer sent to candidate");
        }}
      />
      <Toast message={toast} onClose={() => setToast(null)} />
    </Page>
  );
}
