import { Button, Initials, Modal } from "@/components/portal/ui";
import { PanelCard } from "@/components/portal/panel-card";
import { TraitTag } from "@/components/portal/trait-tag";
import type { WorkStyleTag } from "@/lib/demo/work-style";
import { COMPANIES } from "@/lib/independent/data";
import type { Contract } from "@/lib/independent/data";

/** IN-049 — who the contract is with; the full profile opens read-only. */
export function CompanyCard({ contract, tags, onOpen }: { contract: Contract; tags: WorkStyleTag[]; onOpen: () => void }) {
  return (
    <PanelCard title="Company">
      <div className="flex items-center gap-3">
        <Initials text={contract.initials} className="size-11 shrink-0 text-[13px]" />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <p className="truncate text-[14px] leading-[1.3] font-semibold text-ink">{contract.company}</p>
          <p className="truncate text-[12.5px] leading-[1.3] text-ink-2">{contract.manager} · Hiring manager</p>
        </div>
      </div>
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {tags.map((t) => (
            <TraitTag key={`${t.trait}-${t.label}`} tag={t} view="other" />
          ))}
        </div>
      )}
      <Button size="lg" onClick={onOpen}>
        View company profile
      </Button>
    </PanelCard>
  );
}

/** IN-049 — the company behind the contract, read-only. */
export function CompanyDialog({ contract, tags, open, onClose }: { contract: Contract; tags: WorkStyleTag[]; open: boolean; onClose: () => void }) {
  const company = COMPANIES[contract.company];
  return (
    <Modal open={open} onClose={onClose} title={company?.name ?? contract.company} description="Read-only — how this company describes itself and how it likes to work.">
      <div className="flex flex-col gap-4">
        <div className="flex items-start gap-3">
          <Initials text={contract.initials} className="size-12 shrink-0 text-[14px]" />
          <p className="min-w-0 flex-1 text-[14px] leading-[1.5] text-ink">{company?.description ?? "No company description on file."}</p>
        </div>
        <dl className="flex flex-col gap-2 text-[13px] leading-[1.4]">
          {(
            [
              ["Industry", company?.industry],
              ["Location", company?.location],
              ["Website", company?.url],
              ["Hiring manager", contract.manager],
            ] as const
          ).map(([k, v]) => (
            <div key={k} className="flex gap-2">
              <dt className="w-28 shrink-0 text-ink-2">{k}</dt>
              <dd className="min-w-0 flex-1 text-ink">{v ?? "—"}</dd>
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
      </div>
    </Modal>
  );
}
