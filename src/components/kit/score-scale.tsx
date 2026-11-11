const RATING_LABELS = ["Needs improvement", "Developing", "Meets expectations", "Exceeds expectations", "Excellent"];

/**
 * An editable rating uses one segmented control. Submitted ratings read as a value out of five.
 */
export function ScoreScale({ label, value, onPick, disabled }: { label: string; value: number | undefined; onPick?: (n: number) => void; disabled?: boolean }) {
  if (!onPick)
    return (
      <span className="shrink-0 text-sm font-semibold text-ink tabular-nums">
        {value ?? "—"}{value !== undefined && <span className="font-normal text-ink-2"> / 5</span>}
      </span>
    );
  return (
    <div role="group" aria-label={label} className="shrink-0 sm:w-64">
      <div className="grid grid-cols-5 rounded-lg border border-border bg-white">
        {RATING_LABELS.map((meaning, index) => {
          const rating = index + 1;
          return (
            <button
              key={meaning}
              type="button"
              disabled={disabled}
              aria-pressed={rating === value}
              aria-description={meaning}
              title={meaning}
              onClick={() => onPick(rating)}
              className={`h-9 border-l border-line text-sm font-medium tabular-nums first:rounded-l-[7px] first:border-l-0 last:rounded-r-[7px] focus-visible:z-10 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ink disabled:cursor-not-allowed max-sm:h-11 ${rating === value ? "bg-accent-bg font-semibold text-accent-ink" : "text-ink enabled:hover:bg-surface-2"}`}
            >
              {rating}
            </button>
          );
        })}
      </div>
      <p aria-live="polite" className="mt-1 min-h-4 text-right text-xs text-ink-2">{value !== undefined && RATING_LABELS[value - 1]}</p>
    </div>
  );
}
