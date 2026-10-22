import { ICONS } from "@/components/icons";
import { Button, Card, StatusDot } from "@/components/portal/ui";
import { Tip } from "@/components/portal/tip";
import { useInterviewTime } from "@/lib/independent/interview-time";
import { canJoin, JOIN_OPENS_MINUTES } from "@/lib/portal/dates";
import type { SetToast } from "@/lib/portal/toast";
import type { InterviewActions, StepProps } from "../_lib/steps";

const Copy = ICONS.copy;
const Video = ICONS.video;
const Calendar = ICONS.calendar;

/** IN-070 / IN-071 / IN-092 / IN-093 — an interview invitation: when, how, the link once it's accepted, and the answer (accept, a new time, decline) or the call. */
export function InterviewCard({ app, job, live, ...actions }: StepProps & InterviewActions) {
  const accepted = app.stage === "invite_accepted";
  const clock = useInterviewTime();
  return (
    <Card className="flex flex-col gap-4 p-4">
      {/* IN-070 — where the invitation stands, in place of a sentence saying so. */}
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-[15px] leading-[1.3] font-semibold text-ink">
          <Video size={20} aria-hidden className="text-primary" /> Interview
        </span>
        <StatusDot tone={accepted ? "ok" : "warn"}>{accepted ? "Confirmed" : "Awaiting your reply"}</StatusDot>
      </div>
      <InterviewWhen time={clock.both(job.interview)} format={live?.interview?.format} />
      {/* IN-070 — the link only appears once the invitation has been accepted. */}
      {accepted ? <MeetingLink link={job.interview.link} onToast={actions.onToast} /> : <p className="rounded-lg bg-surface-2 px-3 py-2.5 text-[13px] leading-[1.4] text-ink-2">The meeting link is shared once you accept the invitation.</p>}
      {live?.interview?.note && (
        <div className="flex flex-col gap-1 text-[14px] leading-[1.4]">
          <span className="font-semibold text-ink">Note from {job.company}</span>
          <span className="text-ink-2">{live.interview.note}</span>
        </div>
      )}
      <InterviewAnswer accepted={accepted} link={job.interview.link} open={canJoin(job.interview.when, job.interview.offset)} {...actions} />
    </Card>
  );
}

/** When the interview is (#92 / #96: in the talent's clock, with the Team Builder's beside it), and how it's held once the Team Builder has said. */
function InterviewWhen({ time, format }: { time: string; format: string | undefined }) {
  return (
    <ul className="flex flex-col gap-2.5 text-[14px] leading-[1.3] text-ink">
      <li className="flex items-start gap-2.5">
        <Calendar size={18} aria-hidden className="shrink-0 text-ink-2" /> {time}
      </li>
      {format && (
        <li className="flex items-center gap-2.5">
          <Video size={18} aria-hidden className="shrink-0 text-ink-2" /> {format}
        </li>
      )}
    </ul>
  );
}

/** The meeting link on a confirmed interview, and a button that copies it. */
function MeetingLink({ link, onToast }: { link: string; onToast: SetToast }) {
  const copyLink = () => {
    navigator.clipboard?.writeText(link);
    onToast("Link copied");
  };
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[12.5px] leading-[1.3] font-medium text-ink-2">Meeting link</span>
      <div className="flex items-center gap-1 rounded-lg bg-surface-2 py-1 pr-1 pl-3">
        <span className="min-w-0 flex-1 truncate text-[13.5px] leading-[1.3] text-ink">{link || "Not shared yet"}</span>
        {link && (
          <Tip label="Copy link">
            <button type="button" onClick={copyLink} aria-label="Copy meeting link" className="flex size-8 shrink-0 items-center justify-center rounded-md text-ink-2 transition hover:bg-white hover:text-ink focus-visible:outline-2 focus-visible:outline-primary">
              <Copy size={16} aria-hidden />
            </button>
          </Tip>
        )}
      </div>
    </div>
  );
}

/**
 * Accepting the invitation, asking for a new time or declining it — or, once it's confirmed,
 * joining the call (`open`: from a few minutes before the slot, #97). A confirmed slot can still be
 * moved or declined until it's held.
 */
function InterviewAnswer({ accepted, link, open, onAccept, onDecline, onReschedule }: { accepted: boolean; link: string; open: boolean } & InterviewActions) {
  // Two columns: the answer (or the call) beside a new time, with Decline across the foot. A half-width
  // column has no room for a calendar icon beside "Ask for a new time", and needs the tighter padding.
  return (
    <div className="grid grid-cols-2 gap-2">
      {accepted ? (
        // IN-071 — only on a confirmed interview, and it opens the meeting itself.
        <Button size="lg" variant="primary" className="w-full !px-3" disabled={!link || !open} title={!link ? "No meeting link yet. Ask the Team Builder to share one." : !open ? `Opens ${JOIN_OPENS_MINUTES} minutes before the start` : undefined} onClick={() => window.open(link, "_blank", "noopener")}>
          <Video size={18} aria-hidden /> Join call
        </Button>
      ) : (
        // IN-070: hidden once the status moves past Awaiting Confirmation.
        <Button size="lg" variant="primary" className="w-full !px-3" onClick={onAccept}>
          Accept invitation
        </Button>
      )}
      <Button size="lg" className="w-full !px-3" onClick={onReschedule}>
        Ask for a new time
      </Button>
      {/* #93 — declining keeps the application open, so it's a plain button; the confirm is the red one. */}
      <Button size="lg" className="col-span-2" onClick={onDecline}>
        Decline
      </Button>
    </div>
  );
}
