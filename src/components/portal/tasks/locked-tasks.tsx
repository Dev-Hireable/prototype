import { ICONS } from "@/components/icons";

const Lock = ICONS.lock;

/**
 * A trial's tasks before the talent may read them: they're shared once the proposal is accepted,
 * that is, with the offer. Until then this says how many the company has set, and nothing more.
 */
export function LockedTasks({ company, count }: { company: string; count: number }) {
  return (
    <div className="flex items-start gap-3 rounded-lg bg-surface-alt p-4 outline -outline-offset-1 outline-border">
      <Lock size={20} aria-hidden className="mt-0.5 shrink-0 text-ink-2" />
      <div className="flex flex-col gap-1">
        <p className="text-[14px] leading-[1.4] font-semibold text-ink">Shared after your proposal is accepted</p>
        <p className="text-[13px] leading-[1.45] text-ink-2">{count ? `${company} has set ${count} ${count === 1 ? "task" : "tasks"} for this trial.` : `${company} sets the trial's tasks.`}</p>
      </div>
    </div>
  );
}
