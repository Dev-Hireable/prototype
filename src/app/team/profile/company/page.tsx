"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, LinkButton, Modal, Page, Toast } from "@/components/independent/ui";
import { Completeness, EditableRow, ProfileHeader, ProfileSection } from "@/components/portal/ProfileEditor";
import { useToast, type SetToast } from "@/lib/portal/toast";
import { COMPANY_DESC_MAX, COMPANY_FIELDS, COMPANY_SIZES, INDUSTRIES, isUrl } from "@/lib/team/data";
import { useTeamAccount } from "@/lib/team/account";
import { useRoles } from "@/lib/team/roles";
import type { CompanyProfile } from "@/lib/team/data";
import { TraitTag } from "@/components/portal/TraitTag";
import { traitTagsFor } from "@/lib/demo/work-style";
import { usePickedImage } from "../_lib/image";

type Row = { key: keyof CompanyProfile; label: string; kind: "text" | "long" | "industry" | "size" | "url" };
/** TB-126 — the rows that are a pick from a known list rather than free text. */
const OPTIONS: Partial<Record<Row["kind"], string[]>> = { industry: INDUSTRIES, size: COMPANY_SIZES };

/** In the order the card lists them. */
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
 * The company profile, on the shared profile editor: the logo with its camera button,
 * the six fields that each edit in place and save on their own (the list the dashboard checklist
 * counts, with its progress), and the work style as the trait badges independents see (TB-096/097).
 */
export default function CompanyProfile() {
  const { roles } = useRoles();
  const { company, setCompany } = useTeamAccount();
  const [toast, setToast] = useToast();
  /** TB-123 — the picked logo is previewed and only written on Save. */
  const logo = usePickedImage(setToast);

  const live = roles.filter((r) => r.status === "Active").length;
  const liveOn = `live on ${live} active ${live === 1 ? "role" : "roles"}`;

  return (
    <Page title="Profile">
      <div className="mx-auto flex w-full max-w-[760px] flex-col gap-4">
        <ProfileHeader
          image={<CompanyLogo src={logo.preview ?? company.logo} name={company.name} />}
          imageLabel="Change logo — JPG or PNG, up to 5MB"
          name={company.name}
          pending={!!logo.preview}
          onPick={logo.pick}
          onDiscard={logo.clear}
          onSave={() => {
            if (logo.preview) setCompany({ logo: logo.preview });
            logo.clear();
            setToast(`Logo updated · ${liveOn}`);
          }}
        >
          <p className="text-[13px] leading-[1.4] text-ink-2">Independents see this on every role you post — {live} active right now.</p>
        </ProfileHeader>

        <CompanyDetails liveOn={liveOn} onToast={setToast} />

        {/* TB-097 / TB-096 — the badges are public, so the quiz that produces them lives beside them. */}
        <WorkStyle />
      </div>
      <Toast toast={toast} onClose={() => setToast(null)} />
    </Page>
  );
}

/** The logo, or the company's initials in its place until one is uploaded. */
function CompanyLogo({ src, name }: { src: string | null; name: string }) {
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element -- object URL from a local file, not a remote asset
    <img src={src} alt="" className="size-20 rounded-full bg-white object-cover outline -outline-offset-1 outline-border" />
  ) : (
    <span className="flex size-20 items-center justify-center rounded-full bg-[#5b5bd6] text-[28px] leading-none font-semibold text-white">{name.slice(0, 2).toUpperCase()}</span>
  );
}

/** The six company fields, each edited in place and saved on its own, and the progress while any is empty. */
function CompanyDetails({ liveOn, onToast }: { liveOn: string; onToast: SetToast }) {
  const { company, setCompany } = useTeamAccount();
  const done = ROWS.filter((r) => String(company[r.key]).trim()).length;
  return (
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
              onToast(`${r.label} saved · ${liveOn}`);
            }}
          />
        ))}
      </div>
    </ProfileSection>
  );
}

/** The work style as the trait badges independents see, with the quiz that gives them — taken, or retaken once confirmed. */
function WorkStyle() {
  const { workStyle } = useTeamAccount();
  const router = useRouter();
  const [retake, setRetake] = useState(false);
  const tags = traitTagsFor(workStyle, "team");
  return (
    <>
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
    </>
  );
}
