"use client";

import { Checkbox, Page, Toast } from "@/components/portal/ui";
import { CompanyMark } from "@/components/portal/company-mark";
import { Completeness, EditableRow, ProfileHeader, ProfileSection } from "@/components/portal/profile-editor";
import { WorkStyleSection } from "@/components/team/work-style-section";
import { useToast, type SetToast } from "@/lib/portal/toast";
import { COMPANY_DESC_MAX, COMPANY_FIELDS, COMPANY_SIZES, INDUSTRIES } from "@/lib/team/data";
import { isUrl } from "@/lib/portal/profile-fields";
import { useTeamAccount } from "@/lib/team/account";
import { useRoles } from "@/lib/team/roles";
import type { CompanyProfile } from "@/lib/team/data";
import { usePickedImage } from "../_lib/image";

type Row = { key: (typeof COMPANY_FIELDS)[number]; label: string; kind: "text" | "long" | "industry" | "size" | "url" | "city" };
/** TB-126 — the rows that are a pick from a known list rather than free text. */
const OPTIONS: Partial<Record<Row["kind"], string[]>> = { industry: INDUSTRIES, size: COMPANY_SIZES };

/** In the order the card lists them. */
const LABELS: Record<(typeof COMPANY_FIELDS)[number], { label: string; kind: Row["kind"] }> = {
  name: { label: "Company name", kind: "text" },
  description: { label: "About", kind: "long" },
  url: { label: "Website", kind: "url" },
  industry: { label: "Industry", kind: "industry" },
  location: { label: "Location", kind: "city" },
  size: { label: "Company size", kind: "size" },
};
/** Same field list the dashboard checklist counts, so the two can't disagree about "complete". */
const ROWS: Row[] = COMPANY_FIELDS.map((key) => ({ key, ...LABELS[key] }));

/**
 * The company profile, on the shared profile editor: the logo with its camera button,
 * the six fields that each edit in place and save on their own (the list the dashboard checklist
 * counts, with its progress), and the work style as the tags independents see (TB-096/097).
 */
export default function CompanyProfile() {
  const { roles } = useRoles();
  const { company, setCompany } = useTeamAccount();
  const [toast, setToast] = useToast();
  /** TB-123 — the picked logo is previewed and only written on Save. */
  const logo = usePickedImage(setToast);

  const live = roles.filter((r) => r.status === "Active").length;
  /** Where a change shows, after what was saved: nothing to add while no role is live. */
  const liveOn = live ? ` · live on ${live} active ${live === 1 ? "role" : "roles"}` : "";

  return (
    <Page title="Profile">
      <div className="mx-auto flex w-full max-w-[760px] flex-col gap-4">
        <ProfileHeader
          image={<CompanyLogo src={logo.preview ?? company.logo} name={company.name} />}
          imageLabel="Change logo (JPG or PNG, up to 5MB)"
          name={company.name}
          pending={!!logo.preview}
          onPick={logo.pick}
          onDiscard={logo.clear}
          onSave={() => {
            if (logo.preview) setCompany({ logo: logo.preview });
            logo.clear();
            setToast(`Logo updated${liveOn}`);
          }}
        >
          <p className="text-[13px] leading-[1.4] text-ink-2">Shown on every role you post.</p>
        </ProfileHeader>

        <CompanyDetails liveOn={liveOn} onToast={setToast} />

        {/* TB-097 / TB-096 — the tags are public, so the quiz that gives them lives beside them. */}
        <WorkStyleSection />
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
    <CompanyMark initials={name.slice(0, 2).toUpperCase()} className="size-20 rounded-full text-[28px]" />
  );
}

/**
 * The six company fields, each edited in place and saved on its own, the remote-team switch, and
 * while any field is empty, the progress and which fields are left (each marked Required).
 */
function CompanyDetails({ liveOn, onToast }: { liveOn: string; onToast: SetToast }) {
  const { company, setCompany } = useTeamAccount();
  const left = ROWS.filter((r) => !String(company[r.key]).trim());
  return (
    <ProfileSection title="Company details" description="What Independents read about you before they apply.">
      {/* Only while something's missing: a full bar on a finished profile is just noise. */}
      {left.length > 0 && (
        <Completeness done={ROWS.length - left.length} total={ROWS.length}>
          {left.length} {left.length === 1 ? "field" : "fields"} left: {left.map((r) => r.label).join(", ")}
        </Completeness>
      )}
      <div className="-mx-2 flex flex-col px-2">
        {ROWS.map((r) => (
          <EditableRow
            key={r.key}
            label={r.label}
            value={String(company[r.key])}
            kind={OPTIONS[r.kind] ? "select" : r.kind === "long" || r.kind === "city" ? r.kind : "text"}
            options={OPTIONS[r.kind]}
            required
            // TB-128 — a website that isn't one can't be saved; the description has a cap.
            validate={(d) => (r.kind === "url" && !isUrl(d) ? "Enter a valid website, like nairobisolutions.com." : r.kind === "long" && d.length > COMPANY_DESC_MAX ? `Keep it under ${COMPANY_DESC_MAX} characters.` : null)}
            hint={r.kind === "long" ? (d) => `${d.length} / ${COMPANY_DESC_MAX}` : undefined}
            onSave={(v) => {
              setCompany({ [r.key]: v } as Partial<CompanyProfile>);
              onToast(`${r.label} saved${liveOn}`);
            }}
          />
        ))}
      </div>
      {/* TB-127 — remote is said here, not typed into the location. */}
      <Checkbox
        checked={!!company.remote}
        onChange={(remote) => {
          setCompany({ remote });
          onToast(`${remote ? "Remote team on" : "Remote team off"}${liveOn}`);
        }}
      >
        Remote team
      </Checkbox>
    </ProfileSection>
  );
}
