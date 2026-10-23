"use client";

import { notFound, useSearchParams } from "next/navigation";
import { use, useState } from "react";
import { Page, Toast } from "@/components/portal/ui";
import { BreadcrumbBack } from "@/components/portal/nav";
import { SIDE_COLUMN } from "@/components/portal/page-parts";
import { ReturnNav } from "@/components/portal/return";
import { usePostings } from "@/lib/demo/deal";
import { PAIR } from "@/lib/demo/live";
import { storedWorkStyle } from "@/lib/demo/work-style";
import { roleFromPosting } from "@/lib/independent/data";
import { useSavedRoles } from "@/lib/independent/saved";
import { useApplications } from "@/lib/independent/applications";
import { useIndependentAccount } from "@/lib/independent/account";
import { trialTasksShared } from "@/lib/independent/job-view";
import { useToast } from "@/lib/portal/toast";
import { ApplyDialog } from "./_components/apply-dialog";
import { ApplyBar, CompanyCard } from "./_components/company-card";
import { RoleHeader, RoleSections } from "./_components/role-post";
import { standingOn } from "./_lib/standing";
import { toggleSavedWithNote } from "@/components/portal/notify";

/**
 * IN-012 / IN-017 — a role's detail page, and the confirm before applying to it.
 * The header reads like the talent profile's: the company, the title with its type and match, and a
 * facts strip. Under it the role itself, then how the talent's work style lines up with the
 * company's (the work style tags that replaced the work-style chart), the trial's tasks (shared
 * once their proposal is accepted), and how hiring runs. The company card beside it holds the
 * actions and stays in view; a phone, where the card comes last, pins them along the bottom (ApplyBar).
 */
export default function RoleDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const postings = usePostings();
  const posting = postings.find((p) => p.slug === slug);
  const search = useSearchParams();
  const { workStyle } = useIndependentAccount();
  const { apply, applications, withdrawnRoleSlugs, declinedRoleSlugs, engagement } = useApplications();
  const { saved, toggleSaved } = useSavedRoles();
  const [open, setOpen] = useState(search.get("apply") === "1");
  const [toast, setToast] = useToast();
  if (!posting) notFound();
  const role = roleFromPosting(posting);
  /** IN-064 — the demo's fixed fit; the quiz answers draw the work-style match. */
  const { match } = role;
  const standing = standingOn(role, posting, { applications, withdrawnRoleSlugs, declinedRoleSlugs, engagement });
  const { application, blocked } = standing;
  /** Whether the buttons lead somewhere — Apply, or the application on file — so a phone pins them (ApplyBar). */
  const pinned = !!application || !blocked;
  const isSaved = saved.includes(role.slug);
  const tasks = posting.tasks ?? [];
  /** TB-025 — a trial's tasks are shared once the talent's proposal is accepted (the offer); until then, how many there are. */
  const tasksShared = trialTasksShared(application?.stage);
  /** The company's quiz answers, from the Team Builder's portal — the one company on this demo's board. */
  const theirs = posting.company === PAIR.team.company ? storedWorkStyle("team") : [];

  const send = (note: string) => {
    // IN-017 — the note goes with the application, and so do the quiz results (#77): matching runs on them.
    const sent = apply(role.slug, role.title, role.company, match, { note, quiz: true });
    setOpen(false);
    setToast(sent ? `Application sent to ${role.company}` : "This application couldn't be sent", sent ? "success" : "danger");
  };
  const actions = { standing, isSaved, onApply: () => setOpen(true), onToggleSaved: () => toggleSavedWithNote(role.title, isSaved, () => toggleSaved(role.slug)) };

  return (
    <Page title="Discover roles" nav={<ReturnNav fallback={<BreadcrumbBack href="/independent/jobs">Back to roles</BreadcrumbBack>} />}>
      {/* pt-4: both columns start 24px down, where the sidebar sticks (below the scroller's top fade),
          so they line up at rest and the sidebar doesn't jump when it catches. */}
      <div className="flex items-start gap-10 pt-4 max-lg:flex-col">
        {/* Stacked, the role takes the full width: as wide as its widest part only, a tablet cut the facts strip's figures short. */}
        <div className="flex min-w-0 flex-1 flex-col gap-10 max-lg:self-stretch">
          <RoleHeader role={role} />
          <RoleSections role={role} theirs={theirs} mine={workStyle} tasks={tasks} tasksShared={tasksShared} />
        </div>

        {/* The company card, with the actions, in the app's side column (SIDE_COLUMN): it stays in view
            while the role scrolls — 24px down, below the scroller's top fade (ScrollFade's RAMP), so the
            fade never thins it. */}
        <aside className={`${SIDE_COLUMN} lg:sticky lg:top-6`}>
          <CompanyCard role={role} site={posting.website} pinned={pinned} {...actions} />
        </aside>

        {pinned && <ApplyBar {...actions} />}
      </div>

      <ApplyDialog open={open && !blocked} title={role.title} company={role.company} onClose={() => setOpen(false)} onSend={send} />
      <Toast toast={toast} onClose={() => setToast(null)} />
    </Page>
  );
}
