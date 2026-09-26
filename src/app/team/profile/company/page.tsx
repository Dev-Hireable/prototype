"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, LinkButton, Modal, Page, Toast, useToast } from "@/components/independent/ui";
import { Completeness, EditableRow, ProfileHeader, ProfileSection } from "@/components/portal/ProfileEditor";
import { checkImage, COMPANY_DESC_MAX, COMPANY_FIELDS, COMPANY_SIZES, INDUSTRIES, isUrl, readImage } from "@/lib/team/data";
import { useDemo } from "@/lib/team/store";
import type { CompanyProfile } from "@/lib/team/data";
import { TraitTag } from "@/components/portal/TraitTag";
import { traitTagsFor } from "@/lib/demo/work-style";

type Row = { key: keyof CompanyProfile; label: string; kind: "text" | "long" | "industry" | "size" | "url" };
/** TB-126 — the rows that are a pick from a known list rather than free text. */
const OPTIONS: Partial<Record<Row["kind"], string[]>> = { industry: INDUSTRIES, size: COMPANY_SIZES };

/** The order the Figma card lists them in. */
const LABELS: Record<(typeof COMPANY_FIELDS)[number], { label: string; kind: Row["kind"] }> = {
  name: { label: "Company name", kind: "text" },
  description: { label: "About", kind: "long" },
  url: { label: "Website", kind: "url" },
  industry: { label: "Industry", kind: "industry" },
  location: { label: "Location", kind: "text" },
  size: { label: "Company size", kind: "size" },
};
/** Same field list the dashboard checklist counts, so the two can't disagree about "complete". */
const ROWS: Row[] = COMPANY_FIELDS.map((key) => ({ key, ...LABELS[key] }));

/**
 * Figma "Profile / Company profile", on the shared profile editor: the logo with its camera button,
 * the six fields that each edit in place and save on their own (the list the dashboard checklist
 * counts, with its progress), and the work style as the trait badges independents see (TB-096/097).
 */
export default function CompanyProfile() {
  const { company, setCompany, roles, workStyle } = useDemo();
  const router = useRouter();
  const [retake, setRetake] = useState(false);
  const tags = traitTagsFor(workStyle, "team");
  const [toast, setToast] = useToast();
  /** TB-123 — the picked logo is previewed and only written on Save. */
  const [preview, setPreview] = useState<string | null>(null);

  const done = ROWS.filter((r) => String(company[r.key]).trim()).length;
  const live = roles.filter((r) => r.status === "Active").length;
  const liveOn = `live on ${live} active ${live === 1 ? "role" : "roles"}`;

  const pick = async (f: File | undefined) => {
    if (!f) return;
    const why = checkImage(f);
    if (why) return setToast(why);
    setPreview(await readImage(f));
  };

  return (
    <Page title="Profile">
      <div className="mx-auto flex w-full max-w-[760px] flex-col gap-4">
        <ProfileHeader
          image={
            preview ?? company.logo ? (
              // eslint-disable-next-line @next/next/no-img-element -- object URL from a local file, not a remote asset
              <img src={(preview ?? company.logo) as string} alt="" className="size-20 rounded-full bg-white object-cover outline -outline-offset-1 outline-border" />
            ) : (
              <span className="flex size-20 items-center justify-center rounded-full bg-[#5b5bd6] text-[28px] leading-none font-semibold text-white">{company.name.slice(0, 2).toUpperCase()}</span>
            )
          }
          imageLabel="Change logo — JPG or PNG, up to 5MB"
          name={company.name}
          pending={!!preview}
          onPick={pick}
          onDiscard={() => setPreview(null)}
          onSave={() => {
            if (preview) setCompany({ logo: preview });
            setPreview(null);
            setToast(`Logo updated · ${liveOn}`);
          }}
        >
          <p className="text-[13px] leading-[1.4] text-ink-2">Independents see this on every role you post — {live} active right now.</p>
        </ProfileHeader>

        <ProfileSection title="Company details" description="What independents read about you before they apply.">
          {/* Only while something's missing: a full bar on a finished profile is just noise. */}
          {done < ROWS.length && (
            <Completeness done={done} total={ROWS.length}>
              The dashboard checklist item “Company profile” ticks off once every field is filled in.
            </Completeness>
          )}
          <div className="-mx-2 flex flex-col px-2">
            {ROWS.map((r) => (
              <EditableRow
                key={r.key}
                label={r.label}
                value={String(company[r.key])}
                kind={OPTIONS[r.kind] ? "select" : r.kind === "long" ? "long" : "text"}
                options={OPTIONS[r.kind]}
                // TB-128 — a website that isn't one can't be saved; the description has a cap.
                validate={(d) => (r.kind === "url" && !isUrl(d) ? "Enter a valid website, like nairobisolutions.com." : r.kind === "long" && d.length > COMPANY_DESC_MAX ? `Keep it under ${COMPANY_DESC_MAX} characters.` : null)}
                hint={r.kind === "long" ? (d) => `${d.length} / ${COMPANY_DESC_MAX}` : undefined}
                onSave={(v) => {
                  setCompany({ [r.key]: v } as Partial<CompanyProfile>);
                  setToast(`${r.label} saved · ${liveOn}`);
                }}
              />
            ))}
          </div>
        </ProfileSection>

        {/* TB-097 / TB-096 — the badges are public, so the quiz that produces them lives beside them. */}
        <ProfileSection
          title="Work style"
          description="Shown on your company profile and used to match you with independents."
          action={
            // TB-096 — the quiz is the real app's onboarding (/onboarding/client).
            tags.length ? (
              <Button size="sm" onClick={() => setRetake(true)}>
                Retake quiz
              </Button>
            ) : (
              <LinkButton size="sm" variant="primary" href="/onboarding/client">
                Take the quiz
              </LinkButton>
            )
          }
        >
          {tags.length ? (
            <div className="flex flex-wrap gap-2">
              {tags.map((t) => (
                <TraitTag key={`${t.trait}-${t.label}`} tag={t} />
              ))}
            </div>
          ) : (
            <p className="text-[13px] leading-[1.4] text-ink-2">No badges yet. Take the work-style quiz and the badges it gives your company appear here.</p>
          )}
        </ProfileSection>
      </div>

      <Modal
        open={retake}
        onClose={() => setRetake(false)}
        title="Retake the work-style quiz?"
        description="Your current badges stay until you finish the new quiz. Six scenarios, and the new badges replace the old ones on your company profile and in matching."
        footer={
          <>
            <Button size="lg" onClick={() => setRetake(false)}>
              Cancel
            </Button>
            <Button size="lg" variant="primary" onClick={() => router.push("/onboarding/client")}>
              Start quiz
            </Button>
          </>
        }
      />
      <Toast message={toast} onClose={() => setToast(null)} />
    </Page>
  );
}
