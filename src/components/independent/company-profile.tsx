"use client";

import { Drawer, Initials } from "@/components/portal/ui";
import { TraitTag } from "@/components/portal/trait-tag";
import { usePostings } from "@/lib/demo/deal";
import type { WorkStyleTag } from "@/lib/demo/work-style";
import { COMPANIES } from "@/lib/independent/data";

/** Who the company is: its name, initials and hiring manager, as a contract or a thread knows them. */
export type CompanyRef = { company: string; initials: string; manager: string };

/**
 * IN-049 — the company behind a contract or a thread, read-only, in the same sheet as every other
 * profile: how it describes itself, the facts, and how it likes to work. What the Team Builder saved
 * in their company profile reaches the talent on the roles they publish, so the newest of those is
 * read first; the file's copy only fills in for a company with none.
 */
export function CompanyProfileDrawer({ company: who, tags, open, onClose }: { company: CompanyRef; tags: WorkStyleTag[]; open: boolean; onClose: () => void }) {
  const company = COMPANIES[who.company];
  const posted = usePostings().find((p) => p.company === who.company);
  const facts = [
    ["Industry", posted?.industry || company?.industry],
    ["Location", posted?.location || company?.location],
    ["Website", posted?.website || company?.url],
    ["Hiring manager", who.manager],
  ] as const;
  return (
    <Drawer open={open} onClose={onClose} title="Company profile" width={560}>
      <div className="flex items-center gap-4">
        <Initials text={who.initials} className="size-16 shrink-0 text-[18px]" />
        <h3 className="min-w-0 font-display text-[22px] leading-[1.3] font-semibold text-ink">{company?.name ?? who.company}</h3>
      </div>
      <p className="text-[14px] leading-[1.5] text-ink">{posted?.companyBlurb || company?.description || "No company description on file."}</p>
      <dl className="flex flex-col gap-2 text-[13px] leading-[1.4]">
        {facts.map(([k, v]) => (
          <div key={k} className="flex gap-2">
            <dt className="w-28 shrink-0 text-ink-2">{k}</dt>
            <dd className="min-w-0 flex-1 text-ink">{v || "Not given"}</dd>
          </div>
        ))}
      </dl>
      {tags.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-[13px] leading-[1.4] font-medium text-ink">Work style</p>
          <div className="flex flex-wrap gap-2">
            {tags.map((t) => (
              <TraitTag key={`${t.trait}-${t.label}`} tag={t} view="other" />
            ))}
          </div>
        </div>
      )}
    </Drawer>
  );
}
