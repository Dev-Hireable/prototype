"use client";

import { notFound, useSearchParams } from "next/navigation";
import { use, useState } from "react";
import { Page, Toast } from "@/components/portal/ui";
import { BreadcrumbBack } from "@/components/portal/nav";
import { ReturnNav } from "@/components/portal/return";
import { usePostings } from "@/lib/demo/deal";
import { PAIR } from "@/lib/demo/live";
import { storedWorkStyle } from "@/lib/demo/work-style";
import { roleFromPosting } from "@/lib/independent/data";
import { useSavedRoles } from "@/lib/independent/saved";
import { useApplications } from "@/lib/independent/applications";
import { useIndependentAccount } from "@/lib/independent/account";
import { useToast } from "@/lib/portal/toast";
import { ApplyDialog } from "./_components/apply-dialog";
import { CompanyCard } from "./_components/company-card";
import { RoleHeader, RoleSections } from "./_components/role-post";
import { standingOn } from "./_lib/standing";

/**
 * IN-012 / IN-017 — a role's detail page, and the confirm before applying to it.
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
  const isSaved = saved.includes(role.slug);
  const tasks = posting.tasks ?? [];
  /** TB-025 — a trial's tasks are for candidates the company has matched with or invited, not the public listing. */
  const tasksShared = !!application && application.stage !== "applied";
  /** The company's quiz answers, from the Team Builder's portal — the one company on this demo's board. */
  const theirs = posting.company === PAIR.team.company ? storedWorkStyle("team") : [];

  const send = (extras: { note: string; quiz: boolean }) => {
    // IN-017 — the note and the quiz choice go with the application; they used to be dropped here.
    const sent = apply(role.slug, role.title, role.company, match, extras);
    setOpen(false);
    setToast(sent ? `Application sent to ${role.company}` : "This application couldn't be sent", sent ? "success" : "danger");
  };

  return (
    <Page title="Discover roles" nav={<ReturnNav fallback={<BreadcrumbBack href="/independent/jobs">Back to roles</BreadcrumbBack>} />}>
      {/* pt-4: both columns start 24px down, where the sidebar sticks (below the scroller's top fade),
          so they line up at rest and the sidebar doesn't jump when it catches. */}
      <div className="flex items-start gap-10 pt-4">
        <div className="flex min-w-0 flex-1 flex-col gap-10">
          <RoleHeader role={role} />
          <RoleSections role={role} theirs={theirs} mine={workStyle} tasks={tasks} tasksShared={tasksShared} />
        </div>

        {/* The company card, with the actions: it stays in view while the role scrolls — 24px down,
            below the scroller's top fade (ScrollFade's RAMP), so the fade never thins it. */}
        <aside className="sticky top-6 flex w-[300px] shrink-0 flex-col gap-4">
          <CompanyCard role={role} site={posting.website} standing={standing} isSaved={isSaved} onApply={() => setOpen(true)} onToggleSaved={() => toggleSaved(role.slug)} />
        </aside>
      </div>

      <ApplyDialog open={open && !blocked} title={role.title} company={role.company} onClose={() => setOpen(false)} onSend={send} />
      <Toast toast={toast} onClose={() => setToast(null)} />
    </Page>
  );
}
