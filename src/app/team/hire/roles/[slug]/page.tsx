"use client";

import Link from "next/link";
import { notFound, useSearchParams } from "next/navigation";
import { MdChevronLeft } from "react-icons/md";
import { Suspense, use, useState } from "react";
import { Card, Chip, JobBadge, KeyValue, LinkButton, MatchPill, Page, PIPELINE, StatusDot, Tabs, WorkStyleChart } from "@/components/independent/ui";
import { Person, Row, Table } from "@/components/team/ui";
import { EMPLOYER_STAGE_LABELS, byName } from "@/lib/team/data";
import { useDemo } from "@/lib/team/store";

const COLS = ["min-w-0 flex-1", "w-[110px]", "w-[190px]", "w-[170px]", "w-[130px]", "w-[130px]"];
const H3 = "text-[16px] leading-[1.5] font-semibold tracking-[0.2px] text-[#0a0a0a]";

export default function RolePage({ params }: { params: Promise<{ slug: string }> }) {
  return (
    <Suspense>
      <Role params={params} />
    </Suspense>
  );
}

/** Figma "Candidate tracker / Trial · Full-time": role header with Interested (pipeline) and Role details tabs. */
function Role({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const { roles, candidates } = useDemo();
  const role = roles.find((r) => r.slug === slug);
  if (!role) notFound();
  const [tab, setTab] = useState<"interested" | "details">(useSearchParams().get("tab") === "details" ? "details" : "interested");
  const list = candidates.filter((c) => c.role === role.slug);
  const workStyle = byName(list[0]?.independent ?? "juan-dela-cruz");

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
          value={tab}
          onChange={setTab}
          options={[
            { value: "interested", label: "Interested" },
            { value: "details", label: "Role details" },
          ]}
        />
      }
    >
      <Link href="/team/hire/roles" className="flex h-5 items-center gap-1 self-start text-[14px] leading-[1.2] tracking-[0.2px] text-ink">
        <MdChevronLeft size={16} aria-hidden /> Back to roles
      </Link>

      {tab === "interested" ? (
        <>
          <div className="flex items-center justify-between">
            <p className="text-[14px] leading-[1.4] text-ink-2">
              {list.length} candidates in the pipeline · {role.candidates ?? 0} applied in total
            </p>
            <LinkButton size="lg" href="/team/discover" variant="primary">
              Invite independents
            </LinkButton>
          </div>
          <Table cols={COLS} head={["Candidate", "Match", "Stage", "Status", "Submitted", "Actions"]}>
            {list.map((c) => {
              const p = byName(c.independent);
              const stage = PIPELINE.find((s) => s.key === c.stage);
              return (
                <Row key={c.id}>
                  <span className={COLS[0]}>
                    <Person name={p.name} role={p.role} avatar={p.avatar} href={`/team/hire/roles/${role.slug}/candidates/${c.id}`} />
                  </span>
                  <span className={COLS[1]}>
                    <MatchPill pct={p.match} />
                  </span>
                  <span className={`${COLS[2]} text-[14px] ${c.dropped ? "text-ink-2 line-through" : ""}`}>{EMPLOYER_STAGE_LABELS[c.stage] ?? stage?.label}</span>
                  <span className={COLS[3]}>{c.dropped ? <StatusDot tone="danger">Dropped</StatusDot> : c.status && <StatusDot tone={c.status.tone}>{c.status.label}</StatusDot>}</span>
                  <span className={COLS[4]}>{c.submitted}</span>
                  <span className={COLS[5]}>
                    <LinkButton size="sm" href={`/team/hire/roles/${role.slug}/candidates/${c.id}`}>
                      Open tracker
                    </LinkButton>
                  </span>
                </Row>
              );
            })}
            {list.length === 0 && <p className="border-t border-border px-4 py-8 text-center text-[13px] text-ink-2">No candidates yet. Invite independents from Discover.</p>}
          </Table>
        </>
      ) : (
        /* Figma "Right column": one 640px column of role cards. */
        <div className="mx-auto flex w-[640px] flex-col gap-4">
          <Card className="flex flex-col gap-4 p-4">
            <h2 className="font-display text-[24px] leading-[1.5] font-semibold tracking-[0.2px] text-black" style={{ fontVariationSettings: '"opsz" 14' }}>
              {role.title}
            </h2>
            <p className="flex items-center gap-2 text-[12px] leading-[1.2] tracking-[0.2px] text-ink-2">
              <JobBadge type={role.type} /> Posted Jan 08, 2026
            </p>
            <p className="text-[14px] leading-[1.2] tracking-[0.2px] text-ink">{role.description}</p>
          </Card>
          <Card className="flex flex-col gap-6 p-4">
            <h3 className={H3}>Budget &amp; details</h3>
            <div className="flex gap-2">
              <KeyValue label="Budget" value={role.budget} />
              <KeyValue label="Duration" value={role.duration} />
              <KeyValue label="Experience" value={role.experience} />
            </div>
          </Card>
          <Card className="flex flex-col gap-6 p-4">
            <h3 className={H3}>Skills</h3>
            <div className="flex flex-wrap gap-2">
              {role.skills.map((s) => (
                <Chip key={s} size="sm">
                  {s}
                </Chip>
              ))}
            </div>
          </Card>
          <WorkStyleChart builder={workStyle.workStyle.builder} independent={workStyle.workStyle.independent} match={workStyle.match} />
          <div className="flex flex-col gap-6 text-[14px] leading-[1.2] tracking-[0.2px] text-ink">
            <div className="flex flex-col gap-3">
              <h3 className="font-semibold">{role.type === "trial" ? "Trial expectation" : "Responsibilities"}</h3>
              <p>{role.expectation}</p>
            </div>
            {role.attachment && (
              <div className="flex flex-col gap-3">
                <h3 className="font-semibold">Attachment</h3>
                <a href={role.attachment} target="_blank" rel="noreferrer" className="text-accent-ink">
                  {role.attachment}
                </a>
              </div>
            )}
          </div>
        </div>
      )}
    </Page>
  );
}
