"use client";

import { notFound, useSearchParams } from "next/navigation";
import { use, useState } from "react";
import { ICONS } from "@/components/admin/icons";
import { Button, Card, Checkbox, Chip, Field, JobBadge, LinkButton, MatchPill, Modal, Page, Textarea, Toast, useToast } from "@/components/independent/ui";
import { BreadcrumbBack } from "@/components/portal/nav";
import { FactStrip, Section } from "@/components/portal/PageParts";
import { ReturnNav } from "@/components/portal/return";
import { TaskPlanList } from "@/components/portal/tasks/TaskPlan";
import { WorkStyleMatch } from "@/components/portal/WorkStyleMatch";
import { durationDays } from "@/lib/demo/dates";
import { usePostings } from "@/lib/demo/deal";
import { JOB_TYPE_LABEL, jobFacts } from "@/lib/demo/job-types";
import type { JobType } from "@/lib/demo/job-types";
import { PAIR } from "@/lib/demo/live";
import { storedWorkStyle } from "@/lib/demo/work-style";
import { MATCH_TOOLTIP, roleFromPosting } from "@/lib/independent/data";
import { useDemo } from "@/lib/independent/store";

const DM = { fontVariationSettings: '"opsz" 14' };
const Pin = ICONS.location;
const People = ICONS.people;
const Business = ICONS.business;
const Out = ICONS.northEast;
const Lock = ICONS.lock;
const Saved = ICONS.bookmark;
const Save = ICONS.saved;

const bare = (url: string) => url.replace(/^https?:\/\//i, "").replace(/\/$/, "");

/**
 * IN-012 / IN-017 — Figma "Job Board / Role detail" in the profile's face, + "Apply to role · confirm".
 * The header reads like the talent profile's: the company, the title with its type and match, and a
 * facts strip. Under it the role itself, then how the talent's work style lines up with the
 * company's (the Workplace Tags that replaced the work-style chart), the trial's tasks — shared
 * once they're matched or invited, like the trial expectations were — and how hiring runs. The
 * company card beside it holds the actions and stays in view.
 */
export default function RoleDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const postings = usePostings();
  const posting = postings.find((p) => p.slug === slug);
  const search = useSearchParams();
  const { saved, toggleSaved, apply, applications, withdrawnRoleSlugs, declinedRoleSlugs, engagement, workStyle } = useDemo();
  const [open, setOpen] = useState(search.get("apply") === "1");
  const [note, setNote] = useState("");
  const [includeQuiz, setIncludeQuiz] = useState(true);
  const [toast, setToast] = useToast();
  if (!posting) notFound();
  const role = roleFromPosting(posting);
  /** IN-064 — the demo's fixed fit; the quiz answers draw the work-style match. */
  const { match } = role;
  const application = applications.find((a) => a.roleSlug === role.slug);
  const applied = !!application;
  const withdrawn = withdrawnRoleSlugs.includes(role.slug);
  /** Turned down here before, and that application has since been replaced by another. */
  const declined = !applied && declinedRoleSlugs.includes(role.slug);
  const closed = !!posting.closed;
  /**
   * One engagement at a time: while one is on file for another role, this one can't be applied
   * to. Applying used to overwrite it — contract, escrow record and evaluation included.
   */
  const engagedElsewhere = !applied && engagement && engagement.roleSlug !== role.slug ? engagement : null;
  const blocked = applied || withdrawn || declined || role.filled || closed || !!engagedElsewhere;
  const isSaved = saved.includes(role.slug);
  const website = posting.website ? (/^https?:\/\//.test(posting.website) ? posting.website : `https://${posting.website}`) : null;
  const trial = role.type === "trial";
  const tasks = posting.tasks ?? [];
  /** TB-025 — a trial's tasks are for candidates the company has matched with or invited, not the public listing. */
  const tasksShared = !!application && application.stage !== "applied";
  /** The company's quiz answers, from the Team Builder's portal — the one company on this demo's board. */
  const theirs = posting.company === PAIR.team.company ? storedWorkStyle("team") : [];

  const send = () => {
    // IN-017 — the note and the quiz choice go with the application; they used to be dropped here.
    const sent = apply(role.slug, role.title, role.company, match, { note, quiz: includeQuiz });
    setOpen(false);
    setToast(sent ? `Application sent to ${role.company}` : "This application couldn't be sent");
  };

  /** Three facts, as on the profile: the pay (with a part-time role's hours), how long or when, and the level. */
  const facts = jobFacts({ type: role.type, pay: role.rateRange, duration: role.duration, hours: role.hours, level: role.level });

  const cta = withdrawn ? "Withdrawn" : declined ? "Not selected" : role.filled ? "Position filled" : closed ? "Role closed" : "Apply now";

  return (
    <Page title="Discover roles" nav={<ReturnNav fallback={<BreadcrumbBack href="/independent/jobs">Back to roles</BreadcrumbBack>} />}>
      {/* pt-4: both columns start 24px down, where the sidebar sticks (below the scroller's top fade),
          so they line up at rest and the sidebar doesn't jump when it catches. */}
      <div className="flex items-start gap-10 pt-4">
        <div className="flex min-w-0 flex-1 flex-col gap-10">
          <header className="flex max-w-[768px] flex-col gap-6">
            <div className="flex flex-col gap-2">
              <p className="text-[14px] leading-[1.4] text-ink-2">
                <span className="font-semibold text-ink">{role.company}</span> · {role.about.location} · {role.posted}
              </p>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <h2 className="font-display text-[32px] leading-[1.3] font-semibold text-ink" style={DM}>
                  {role.title}
                </h2>
                <span className="flex items-center gap-2">
                  <JobBadge type={role.type} />
                  {/* IN-012 — colour coded by band, with the tooltip that explains the score. */}
                  <MatchPill pct={match} coded title={MATCH_TOOLTIP} />
                </span>
              </div>
            </div>
            <FactStrip cells={facts} />
          </header>

          <Section title="About the role">
            {role.description.map((p) => (
              <p key={p} className="text-[14px] leading-[1.5] tracking-[0.2px] whitespace-pre-line text-ink">
                {p}
              </p>
            ))}
          </Section>

          <Section title="Skills">
            <div className="flex flex-wrap gap-2">
              {role.skills.map((s) => (
                <Chip key={s}>{s}</Chip>
              ))}
            </div>
          </Section>

          <Section title="Work style">
            <WorkStyleMatch company={role.company} theirs={theirs} mine={workStyle} />
          </Section>

          {trial && (
            <Section title="Trial tasks" action={tasksShared && tasks.length > 0 && <span className="text-[13px] leading-[1.4] text-ink-2">Set by {role.company} · due by week</span>}>
              {tasksShared ? (
                <TaskPlanList tasks={tasks} empty={`${role.company} hasn't listed the trial's tasks yet — they're set in the offer.`} />
              ) : (
                <div className="flex items-start gap-3 rounded-lg bg-surface-alt p-4 outline -outline-offset-1 outline-border">
                  <Lock size={20} aria-hidden className="mt-0.5 shrink-0 text-ink-2" />
                  <div className="flex flex-col gap-1">
                    <p className="text-[14px] leading-[1.4] font-semibold text-ink">Shared once you&apos;re matched</p>
                    <p className="text-[13px] leading-[1.45] text-ink-2">
                      {tasks.length ? `${role.company} has set ${tasks.length} ${tasks.length === 1 ? "task" : "tasks"} for this trial.` : `${role.company} sets the trial's tasks.`} You&apos;ll see them once they match with you or invite you to interview, and your proposal prices them.
                    </p>
                  </div>
                </div>
              )}
            </Section>
          )}

          <Section title="How hiring works">
            <HiringSteps type={role.type} company={role.company} duration={role.duration} />
          </Section>
        </div>

        {/* Figma "Company", with the actions: it stays in view while the role scrolls — 24px down,
            below the scroller's top fade (ScrollFade's RAMP), so the fade never thins it. */}
        <aside className="sticky top-6 flex w-[300px] shrink-0 flex-col gap-4">
          <Card className="flex flex-col gap-5 p-5">
            <div className="flex items-center gap-3">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-[#5b5bd6] text-[18px] leading-none font-semibold text-white">{role.initials}</span>
              <div className="flex min-w-0 flex-col gap-0.5">
                <h3 className="truncate font-display text-[18px] leading-[1.3] font-semibold text-ink" style={DM}>
                  {role.company}
                </h3>
                {role.about.industry && <p className="truncate text-[13px] leading-[1.3] text-ink-2">{role.about.industry}</p>}
              </div>
            </div>
            {role.about.blurb && <p className="text-[14px] leading-[1.45] text-ink-2">{role.about.blurb}</p>}
            <ul className="flex flex-col gap-2.5 text-[14px] leading-[1.3] text-ink">
              {role.about.location && (
                <li className="flex items-center gap-2">
                  <Pin size={18} aria-hidden className="shrink-0 text-ink-2" /> {role.about.location}
                </li>
              )}
              {role.about.size && (
                <li className="flex items-center gap-2">
                  <People size={18} aria-hidden className="shrink-0 text-ink-2" /> {role.about.size.replace("-", "–")} people
                </li>
              )}
              <li className="flex items-center gap-2">
                <Business size={18} aria-hidden className="shrink-0 text-ink-2" /> {role.hires} {role.hires === 1 ? "opening" : "openings"} · {JOB_TYPE_LABEL[role.type]}
              </li>
              {website && (
                <li>
                  <a href={website} target="_blank" rel="noreferrer" className="inline-flex max-w-full items-center gap-2 font-medium text-primary hover:underline">
                    <Out size={18} aria-hidden className="shrink-0" /> <span className="truncate">{bare(website)}</span>
                  </a>
                </li>
              )}
            </ul>
            <div className="flex flex-col gap-2">
              {/* An application already on file opens from here, rather than a greyed-out "Applied". */}
              {application ? (
                <LinkButton size="lg" variant="primary" href={`/independent/jobs/applications/${application.id}`}>
                  View application
                </LinkButton>
              ) : (
                <Button size="lg" variant="primary" disabled={blocked} onClick={() => setOpen(true)}>
                  {cta}
                </Button>
              )}
              <Button size="lg" onClick={() => toggleSaved(role.slug)}>
                {isSaved ? <Saved size={18} aria-hidden className="text-primary" /> : <Save size={18} aria-hidden />}
                {isSaved ? "Saved" : "Save role"}
              </Button>
            </div>
            {withdrawn && <p className="text-[12px] leading-[1.4] text-danger">You withdrew this application and cannot apply to this role again.</p>}
            {declined && <p className="text-[12px] leading-[1.4] text-ink-2">{role.company} did not move forward with your application for this role, so it cannot be applied to again.</p>}
            {role.filled && !applied && <p className="text-[12px] leading-[1.4] text-ink-2">This role has been filled and is no longer taking applications.</p>}
            {closed && !applied && !role.filled && <p className="text-[12px] leading-[1.4] text-ink-2">{role.company} has closed this role, so it is no longer taking applications.</p>}
            {engagedElsewhere && !withdrawn && !declined && !role.filled && !closed && (
              <p className="text-[12px] leading-[1.4] text-ink-2">
                You already have an engagement with {engagedElsewhere.company} on {engagedElsewhere.title}. The demo runs one engagement at a time —{" "}
                {engagedElsewhere.withdrawable ? "withdraw that application first, or use Reset demo at the top right." : "it's a signed contract, so use Reset demo at the top right to start another."}
              </p>
            )}
          </Card>
        </aside>
      </div>

      <Modal
        open={open && !blocked}
        onClose={() => setOpen(false)}
        title={`Apply to ${role.title} at ${role.company}`}
        description="Your profile, monthly rate and availability go with the application. Add a short note so Alex knows why you fit."
        footer={
          <>
            <Button size="lg" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button size="lg" variant="primary" onClick={send}>
              Send application
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <Field label="Note to the employer (optional)">
            <Textarea rows={3} className="h-[78px]" value={note} onChange={(e) => setNote(e.target.value)} placeholder={`Tell ${role.company} why you fit this role`} />
          </Field>
          <Checkbox checked={includeQuiz} onChange={setIncludeQuiz}>
            Include my Hireable quiz results
          </Checkbox>
        </div>
      </Modal>
      <Toast message={toast} onClose={() => setToast(null)} />
    </Page>
  );
}

/**
 * How the role is hired, as four numbered steps: a trial ends in paid, escrowed work on the tasks
 * the company set; a full-time or part-time role hires straight onto the contract.
 */
function HiringSteps({ type, company, duration }: { type: JobType; company: string; duration: string }) {
  const steps =
    type === "trial"
      ? [
          { title: "Apply", body: "Send your profile, with a short note if you like." },
          { title: "Interview", body: `${company} invites its best matches to a call.` },
          { title: "Proposal", body: "Your monthly rate for the trial's tasks, with a cover letter." },
          { title: "Paid trial", body: `${durationDays(duration)} working days of real work, paid from escrow when it ends. Starts within 2 weeks of the offer.` },
        ]
      : [
          { title: "Apply", body: "Send your profile, with a short note if you like." },
          { title: "Interview", body: `${company} invites its best matches to a call.` },
          { title: "Proposal", body: `Your ${type === "full-time" ? "expected salary" : "rate and hours a week"}, with a cover letter.` },
          { title: "Offer", body: `Hired straight onto the ${JOB_TYPE_LABEL[type].toLowerCase()} role, paid monthly. ${company} sets your first tasks.` },
        ];
  return (
    // Four across where there's room, two by two where there isn't — the line runs on to the next step in its row.
    <div className="@container">
      <ol className="grid grid-cols-2 gap-x-4 gap-y-6 @xl:grid-cols-4">
        {steps.map((s, i) => (
          <li key={s.title} className="flex min-w-0 flex-col gap-2">
            <span className="flex items-center gap-2">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-accent-bg text-[13px] leading-none font-semibold text-primary">{i + 1}</span>
              {i < steps.length - 1 && <span aria-hidden className={`h-px flex-1 bg-border ${i % 2 ? "hidden @xl:block" : ""}`} />}
            </span>
            <span className="text-[14px] leading-[1.3] font-semibold text-ink">{s.title}</span>
            <span className="text-[13px] leading-[1.45] text-ink-2">{s.body}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
