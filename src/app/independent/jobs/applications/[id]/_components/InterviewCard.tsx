import { ICONS } from "@/components/admin/icons";
import { Button, Card, StatusDot } from "@/components/independent/ui";
import { Tip } from "@/components/portal/Tip";
import type { SetToast } from "@/lib/portal/toast";
import type { InterviewActions, StepProps } from "../_lib/steps";

const Copy = ICONS.copy;
const Video = ICONS.video;
const Calendar = ICONS.calendar;
const Clock = ICONS.clock;

/** IN-070 / IN-071 — an interview invitation: when, how, the link once it's accepted, and the answer or the call. */
export function InterviewCard({ app, job, live, onAccept, onDecline, onToast }: StepProps & InterviewActions) {
  const accepted = app.stage === "invite_accepted";
  return (
    <Card className="flex flex-col gap-4 p-4">
      {/* IN-070 — where the invitation stands, in place of a sentence saying so. */}
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-[15px] leading-[1.3] font-semibold text-ink">
          <Video size={20} aria-hidden className="text-primary" /> Interview
        </span>
        <StatusDot tone={accepted ? "ok" : "warn"}>{accepted ? "Confirmed" : "Awaiting your reply"}</StatusDot>
      </div>
      <InterviewWhen date={job.interview.date} time={job.interview.time} format={live?.interview?.format} />
      {/* IN-070 — the link only appears once the invitation has been accepted. */}
      {accepted ? <MeetingLink link={job.interview.link} onToast={onToast} /> : <p className="rounded-lg bg-surface-2 px-3 py-2.5 text-[13px] leading-[1.4] text-ink-2">The meeting link is shared once you accept the invitation.</p>}
      {live?.interview?.note && (
        <div className="flex flex-col gap-1 text-[14px] leading-[1.4]">
          <span className="font-semibold text-ink">Note from {job.company}</span>
          <span className="text-ink-2">{live.interview.note}</span>
        </div>
      )}
      <InterviewAnswer accepted={accepted} link={job.interview.link} onAccept={onAccept} onDecline={onDecline} onToast={onToast} />
    </Card>
  );
}

/** When the interview is, and how it's held once the Team Builder has said. */
function InterviewWhen({ date, time, format }: { date: string; time: string; format: string | undefined }) {
  return (
    <ul className="flex flex-col gap-2.5 text-[14px] leading-[1.3] text-ink">
      <li className="flex items-center gap-2.5">
        <Calendar size={18} aria-hidden className="shrink-0 text-ink-2" /> {date}
      </li>
      <li className="flex items-center gap-2.5">
        <Clock size={18} aria-hidden className="shrink-0 text-ink-2" /> {time}
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

/** Accepting or declining the invitation — or, once it's confirmed, joining the call. */
function InterviewAnswer({ accepted, link, onAccept, onDecline, onToast }: { accepted: boolean; link: string } & InterviewActions) {
  return accepted ? (
    // IN-071 — only on a confirmed interview, and it opens the meeting itself.
    <Button
      size="lg"
      variant="primary"
      onClick={() => {
        if (!link) return onToast("No meeting link yet — ask the Team Builder to share one.", "danger");
        window.open(link, "_blank", "noopener");
      }}
    >
      <Video size={18} aria-hidden /> Join call
    </Button>
  ) : (
    // IN-070: hidden once the status moves past Awaiting Confirmation.
    <div className="flex flex-col gap-2">
      <Button size="lg" variant="primary" onClick={onAccept}>
        Accept invitation
      </Button>
      <Button size="lg" variant="danger" onClick={onDecline}>
        Decline
      </Button>
    </div>
  );
}
