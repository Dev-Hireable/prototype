"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Button, Card, Input, LinkButton, Modal, Page, Select, Textarea, Toast, useToast } from "@/components/independent/ui";
import { checkImage, COMPANY_DESC_MAX, COMPANY_FIELDS, COMPANY_SIZES, INDUSTRIES, isUrl, readImage } from "@/lib/team/data";
import { useDemo } from "@/lib/team/store";
import type { CompanyProfile } from "@/lib/team/data";
import { WorkStyleChip } from "@/components/portal/TraitTag";
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

/** Figma "Profile / Company profile": 72px #5b5bd6 logo tile, DM Sans 22 name, inline-edit rows. */
export default function CompanyProfile() {
  const { company, setCompany, roles, workStyle } = useDemo();
  const router = useRouter();
  const [editing, setEditing] = useState<Row | null>(null);
  const [draft, setDraft] = useState("");
  const [retake, setRetake] = useState(false);
  const tags = traitTagsFor(workStyle, "team");
  const [toast, setToast] = useToast();
  /** TB-123 — the picked logo is previewed and only written on Save. */
  const [preview, setPreview] = useState<string | null>(null);
  const file = useRef<HTMLInputElement>(null);

  const done = ROWS.filter((r) => String(company[r.key]).trim()).length;
  const live = roles.filter((r) => r.status === "Active").length;
  /** TB-128 — a website that isn't one can't be saved; everything else just needs content. */
  const invalid = editing?.kind === "url" && draft.trim() !== "" && !isUrl(draft);
  const tooLong = editing?.kind === "long" && draft.length > COMPANY_DESC_MAX;

  const pick = async (f: File | undefined) => {
    if (!f) return;
    const why = checkImage(f);
    if (why) return setToast(why);
    setPreview(await readImage(f));
  };

  const save = () => {
    if (!editing || !draft.trim() || invalid || tooLong) return;
    setCompany({ [editing.key]: draft.trim() } as Partial<CompanyProfile>);
    setToast(`${editing.label} saved · live on ${live} active ${live === 1 ? "role" : "roles"}`);
    setEditing(null);
  };

  return (
    <Page title="Profile">
      <Card className="mx-auto flex w-[760px] flex-col gap-4 p-6">
        <div className="flex items-center gap-4">
          {preview ?? company.logo ? (
            // eslint-disable-next-line @next/next/no-img-element -- object URL from a local file, not a remote asset
            <img src={(preview ?? company.logo) as string} alt="" className="size-[72px] shrink-0 rounded-lg object-cover" />
          ) : (
            <span className="flex size-[72px] shrink-0 items-center justify-center rounded-lg bg-[#5b5bd6] text-[29px] leading-[1.4] font-semibold text-white">
              {company.name.slice(0, 2).toUpperCase()}
            </span>
          )}
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <p className="font-display text-[22px] leading-[1.5] font-semibold text-ink" style={{ fontVariationSettings: '"opsz" 14' }}>
              {company.name}
            </p>
            <p className="text-[13px] leading-[1.4] text-ink-2">Independents see this on every role you post — {live} active right now.</p>
          </div>
          {/* TB-123 — same rules as the profile photo: JPG or PNG, under 5MB, previewed first. */}
          <input ref={file} type="file" accept="image/jpeg,image/png" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
          {preview ? (
            <div className="flex shrink-0 gap-2">
              <Button size="sm" onClick={() => setPreview(null)}>
                Discard
              </Button>
              <Button
                size="sm"
                variant="primary"
                onClick={() => {
                  setCompany({ logo: preview });
                  setPreview(null);
                  setToast(`Logo updated on ${live} active ${live === 1 ? "role" : "roles"}`);
                }}
              >
                Save logo
              </Button>
            </div>
          ) : (
            <Button size="sm" onClick={() => file.current?.click()}>
              Change logo
            </Button>
          )}
        </div>

        <div className="flex flex-col">
          {ROWS.map((r) => {
            const value = String(company[r.key]);
            const open = editing?.key === r.key;
            return (
              <div key={r.key} className={`flex gap-4 border-b border-border py-3 ${open && r.kind === "long" ? "items-start" : "items-center"}`}>
                <span className="w-40 shrink-0 pt-1 text-[13px] leading-[1.4] font-medium text-ink-2">{r.label}</span>
                {open ? (
                  <>
                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                      {OPTIONS[r.kind] ? (
                        <Select options={OPTIONS[r.kind]!} value={draft} onChange={(e) => setDraft(e.target.value)} />
                      ) : r.kind === "long" ? (
                        <Textarea rows={4} value={draft} onChange={(e) => setDraft(e.target.value)} />
                      ) : (
                        <Input value={draft} onChange={(e) => setDraft(e.target.value)} />
                      )}
                      {r.kind === "long" && (
                        <p className={`text-[12px] leading-[1.4] ${tooLong ? "text-danger" : "text-ink-2"}`}>
                          {draft.length} / {COMPANY_DESC_MAX} characters
                        </p>
                      )}
                      {invalid && <p className="text-[12px] leading-[1.4] text-danger">Enter a valid website, like nairobisolutions.com.</p>}
                    </div>
                    <Button size="sm" onClick={() => setEditing(null)}>
                      Cancel
                    </Button>
                    <Button size="sm" variant="primary" disabled={!draft.trim() || !!invalid || !!tooLong} onClick={save}>
                      Save
                    </Button>
                  </>
                ) : (
                  <>
                    <span className="min-w-0 flex-1 text-[14px] leading-[1.4] text-ink">{value}</span>
                    <Button
                      size="sm"
                      onClick={() => {
                        setEditing(r);
                        setDraft(value);
                      }}
                    >
                      Edit
                    </Button>
                  </>
                )}
              </div>
            );
          })}
        </div>
        <p className="text-[12px] leading-[1.4] text-ink-2">
          {done} of {ROWS.length} fields complete. The dashboard checklist item “Company profile” is {done === ROWS.length ? "ticked off" : "still open"}.
        </p>
      </Card>

      {/* TB-097 / TB-096 — the badges are public, so the quiz that produces them lives beside them. */}
      <Card className="mx-auto flex w-[760px] flex-col gap-4 p-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 flex-1 flex-col gap-0.5 leading-[1.4]">
            <p className="text-[16px] font-semibold text-ink">Work style</p>
            <p className="text-[12px] text-ink-2">Shown on your company profile and used to match you with independents.</p>
          </div>
          {/* TB-096 — the quiz is the real app's onboarding (/onboarding/client). It used to cycle
              three typed-in badge sets. */}
          {tags.length ? (
            <Button size="sm" onClick={() => setRetake(true)}>
              Retake quiz
            </Button>
          ) : (
            <LinkButton size="sm" variant="primary" href="/onboarding/client">
              Take the quiz
            </LinkButton>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {tags.length ? (
            tags.map((t) => <WorkStyleChip key={`${t.trait}-${t.label}`} tag={t} />)
          ) : (
            <p className="text-[13px] leading-[1.4] text-ink-2">No badges yet. Take the work-style quiz and the badges it gives your company appear here.</p>
          )}
        </div>
      </Card>

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
