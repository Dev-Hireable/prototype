"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Page } from "@/components/portal/ui";
import { BreadcrumbBack } from "@/components/portal/nav";
import { useRoles } from "@/lib/team/roles";
import { useCards } from "@/lib/team/account";
import type { JobType } from "@/lib/contract/job-types";
import type { Role } from "@/lib/team/data";
import { Cta, WizardHeader } from "./_components/frame";
import { Published } from "./_components/published";
import { ReviewStep } from "./_components/review";
import { BenefitsStep, BudgetStep, DetailsStep, TasksStep } from "./_components/steps";
import { useReviewEdits, useRoleForm, useRoleType, useTemplates, type RoleForm } from "./_lib/form";
import { freshSlug, PATH, roleFrom, stepDone, warmBadge, weeksFor, type PathCopy } from "./_lib/wizard";

export default function CreateRoleWizardPage() {
  return (
    <Suspense>
      <CreateRoleWizard />
    </Suspense>
  );
}

/**
 * `?edit=` opens a draft to finish. Drafts hydrate from storage after mount, so the wizard is keyed
 * on the draft: it starts over, filled in from it, when the draft turns up (TB-035).
 */
function CreateRoleWizard() {
  const search = useSearchParams();
  const editSlug = search.get("edit");
  const { roles } = useRoles();
  const editing = editSlug ? roles.find((r) => r.slug === editSlug) : undefined;
  return <Wizard key={editing?.slug ?? "new"} editing={editing} type={search.get("type")} />;
}

function Wizard({ editing, type: param }: { editing: Role | undefined; type: string | null }) {
  const router = useRouter();
  const { cards } = useCards();
  const [type, setOngoing] = useRoleType(editing, param);
  const t = PATH[type];
  const f = useRoleForm(editing, t);
  const templates = useTemplates(f, type, t.chips);
  const edits = useReviewEdits(f);
  const { slug, canPublish, publish, saveDraft } = usePublish(f, t, type, editing);
  /** Which card this slot shows — the two paths order their steps differently. */
  const kind = t.sequence[f.step];
  const weeks = weeksFor(t.chips, f.chip);

  const goTo = (next: number) => {
    f.setStep(next);
    window.scrollTo({ top: 0 });
  };
  /** The previous step, or the role-type choice from the first one; an open Review edit is dropped first. */
  const back = () => {
    if (edits.editing) edits.cancel();
    if (f.step === 0) router.push("/team/hire");
    else goTo(f.step - 1);
  };

  if (kind === "published") return <Published t={t} slug={slug} />;
  warmBadge();
  const cta = <Cta next={t.next[f.step]} disabled={!stepDone(kind, f)} onNext={() => goTo(f.step + 1)} onDraft={saveDraft} />;
  return (
    <Page title="Create Role" padded={false} nav={<BreadcrumbBack onClick={back}>{f.step === 0 ? "Back to role type" : `Back to ${t.steps[f.step - 1]}`}</BreadcrumbBack>}>
      <div className="flex flex-col items-center gap-6 px-10 pt-4 pb-20">
        <WizardHeader t={t} kind={kind} step={f.step} />
        {kind === "details" && <DetailsStep f={f} t={t} type={type} editing={!!editing} templates={templates} onType={setOngoing} cta={cta} />}
        {kind === "expectations" && <TasksStep f={f} t={t} weeks={weeks} cta={cta} />}
        {kind === "budget" && <BudgetStep f={f} t={t} type={type} template={templates.template} cta={cta} />}
        {kind === "benefits" && <BenefitsStep f={f} cta={cta} />}
        {kind === "review" && <ReviewStep f={f} t={t} type={type} weeks={weeks} edits={edits} canPublish={canPublish} hasCard={cards.length > 0} onDraft={saveDraft} onPublish={publish} />}
      </div>
    </Page>
  );
}

/** Publishing the role, or saving it as a draft to finish later, under the slug it keeps from here on. */
function usePublish(f: RoleForm, t: PathCopy, type: JobType, editing: Role | undefined) {
  const router = useRouter();
  const { addRole, roles, canPublish } = useRoles();
  /**
   * Keep the draft's slug when editing, so publishing replaces it instead of leaving it behind. A
   * new role gets a slug no other role has (freshSlug). Frozen once published, for the links after.
   */
  const [publishedSlug, setPublishedSlug] = useState<string | null>(null);
  const slug = publishedSlug ?? editing?.slug ?? freshSlug(f.title, roles);

  const publish = () => {
    if (!canPublish) return;
    const role = roleFrom(f, { slug, type, status: "Active", chips: t.chips });
    addRole(role);
    setPublishedSlug(role.slug);
    f.setStep(t.sequence.indexOf("published"));
  };
  /**
   * TB-030 — Save as draft used to navigate away and keep nothing: the role was gone. It now
   * writes what has been filled in so far, so the draft can be reopened and finished.
   */
  const saveDraft = () => {
    addRole(roleFrom(f, { slug, type, status: "Draft", chips: t.chips }));
    router.push("/team/hire/roles");
  };
  return { slug, canPublish, publish, saveDraft };
}
