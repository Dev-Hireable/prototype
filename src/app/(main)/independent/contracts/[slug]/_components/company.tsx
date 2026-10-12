import { Button, Initials } from "@/components/portal/ui";
import { PanelCard } from "@/components/portal/panel-card";
import { TraitTag } from "@/components/portal/trait-tag";
import type { WorkStyleTag } from "@/lib/demo/work-style";
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
