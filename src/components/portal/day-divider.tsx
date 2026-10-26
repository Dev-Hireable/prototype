/**
 * Where a new day starts in a stream (a Messages thread, a task's activity): its name between two
 * hairlines. `className` adds the room a stream wants round it.
 */
export function DayDivider({ label, className = "" }: { label: string; className?: string }) {
  return (
    <p className={`flex items-center gap-3 text-[11px] leading-[1.45] font-semibold text-muted ${className}`}>
      <span aria-hidden className="h-px flex-1 bg-line" />
      {label}
      <span aria-hidden className="h-px flex-1 bg-line" />
    </p>
  );
}
