"use client";

import { notFound, useSearchParams } from "next/navigation";
import { use, useState } from "react";
import {
  BackLink,
  Button,
  Card,
  Checkbox,
  Chip,
  Field,
  JobBadge,
  MatchPill,
  Modal,
  ObjectiveRow,
  Page,
  Textarea,
  Toast,
  WorkStyleChart,
  useToast,
} from "@/components/independent/ui";
import { roles } from "@/lib/independent/data";
import { useDemo } from "@/lib/independent/store";

/** Figma "Job Board / Role detail" + "Apply to role · confirm" modal. */
export default function RoleDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const role = roles.find((r) => r.slug === slug);
  if (!role) notFound();
  const search = useSearchParams();
  const { saved, toggleSaved, apply, applications, withdrawnRoleSlugs } = useDemo();
  const applied = applications.some((a) => a.roleSlug === role.slug);
  const withdrawn = withdrawnRoleSlugs.includes(role.slug);
  const [open, setOpen] = useState(search.get("apply") === "1" && !applied && !withdrawn);
  const [note, setNote] = useState("");
  const [includeQuiz, setIncludeQuiz] = useState(true);
  const [toast, setToast] = useToast();
  const isSaved = saved.includes(role.slug);

  const send = () => {
    apply(role.slug, role.title, role.company, role.match);
    setOpen(false);
    setToast(`Application sent to ${role.company}`);
  };

  return (
    <Page title="Discover roles" heading="default">
      <BackLink href="/independent/jobs">Back to roles</BackLink>
      <div className="flex items-start gap-8">
        <div className="flex min-w-0 flex-1 flex-col gap-5">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="font-display text-[26px] leading-[1.5] font-semibold text-ink" style={{ fontVariationSettings: '"opsz" 14' }}>
              {role.title}
            </h2>
            <JobBadge type={role.type} />
            <MatchPill pct={role.match} />
          </div>
          <p className="text-[14px] leading-[1.4] font-medium text-ink">Rate: {role.rateRange} · 30-day trial · Starts within 2 weeks of acceptance</p>
          <section className="flex flex-col gap-2 text-[14px] leading-[1.4]">
            <h3 className="font-semibold text-ink">Role description</h3>
            {role.description.map((p) => (
              <p key={p} className="max-w-[740px] text-ink-2">
                {p}
              </p>
            ))}
          </section>
          <section className="flex flex-col gap-2">
            <h3 className="text-[14px] leading-[1.4] font-semibold text-ink">Skills</h3>
            <div className="flex flex-wrap gap-2">
              {(role.slug === "sales-manager" ? ["Outbound sales", "Discovery calls", "HubSpot", "Coaching", "Forecasting"] : [...role.skills, "Coaching"].slice(0, 5)).map((s) => (
                <Chip key={s}>{s}</Chip>
              ))}
            </div>
          </section>
          <WorkStyleChart builder={role.workStyle.builder} independent={role.workStyle.independent} match={role.match} />
          <section className="flex flex-col gap-2">
            <h3 className="text-[14px] leading-[1.4] font-semibold text-ink">Trial objectives</h3>
            {role.objectives.map((o, i) => (
              <ObjectiveRow key={o} index={i}>
                {o}
              </ObjectiveRow>
            ))}
            <p className="max-w-[740px] text-[12px] leading-[1.4] text-ink-2">These are the outcomes the employer expects during the trial. You commit to them when you accept the offer.</p>
          </section>
          <dl className="flex gap-8 leading-[1.4] font-medium">
            {[
              ["Experience", role.level],
              ["Duration", "30 days"],
              ["Hires", "1 position"],
            ].map(([k, v]) => (
              <div key={k} className="flex flex-col gap-0.5">
                <dt className="text-[12px] text-ink-2">{k}</dt>
                <dd className="text-[14px] text-ink">{v}</dd>
              </div>
            ))}
          </dl>
        </div>

        {/* Figma "Company": 300 wide, p 20, gap 12 */}
        <Card className="flex w-[300px] shrink-0 flex-col gap-3 p-5">
          <span className="flex size-14 items-center justify-center rounded-lg bg-[#5b5bd6] text-[22px] leading-[1.4] font-semibold text-white">{role.initials}</span>
          <h3 className="font-display text-[18px] leading-[1.5] font-semibold text-ink" style={{ fontVariationSettings: '"opsz" 14' }}>
            {role.company} Inc.
          </h3>
          <Button variant="primary" size="lg" disabled={applied || withdrawn} onClick={() => setOpen(true)}>
            {withdrawn ? "Withdrawn" : applied ? "Applied" : "Apply now"}
          </Button>
          <Button size="lg" onClick={() => toggleSaved(role.slug)}>
            {isSaved ? "Saved" : "Save role"}
          </Button>
          <p className="max-w-[260px] text-[13px] leading-[1.4] text-ink-2">{role.about.blurb}</p>
          <p className="text-[13px] leading-[1.4] text-ink-2">{role.about.location}</p>
          <p className="text-[13px] leading-[1.4] text-ink-2">{role.about.industry}</p>
          <p className="text-[13px] leading-[1.4] text-ink-2">{role.about.size}</p>
          {withdrawn && <p className="text-[12px] leading-[1.4] text-danger">You withdrew this application and cannot apply to this role again.</p>}
          <Button size="lg">Visit website</Button>
        </Card>
      </div>

      <Modal
        open={open}
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
