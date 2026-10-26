/** A 1–5 tile, the picked one filled blue. */
const tile = (picked: boolean) =>
  `flex h-9 w-11 items-center max-sm:w-auto justify-center rounded-md text-[14px] leading-[1.4] font-medium ${picked ? "bg-primary text-white outline -outline-offset-1 outline-primary" : "bg-surface-2 text-ink outline -outline-offset-1 outline-border"}`;

const SCALE = [1, 2, 3, 4, 5];

/**
 * An evaluation criterion's 1–5 scale, the same tiles where the Team Builder scores it and where the
 * talent reads the score. With `onPick` it's a group of buttons named by `label` (on a phone 44px
 * tall, a finger's target); without, the scores as read-only tiles. On a phone the five share the width.
 */
export function ScoreScale({ label, value, onPick, disabled }: { label: string; value: number | undefined; onPick?: (n: number) => void; disabled?: boolean }) {
  if (!onPick)
    return (
      <div className="flex gap-2 max-sm:grid max-sm:grid-cols-5">
        {SCALE.map((n) => (
          <span key={n} className={tile(n === value)}>
            {n}
          </span>
        ))}
      </div>
    );
  return (
    <div role="group" aria-label={label} className="flex gap-2 max-sm:grid max-sm:grid-cols-5">
      {SCALE.map((n) => (
        <button key={n} type="button" disabled={disabled} aria-pressed={n === value} onClick={() => onPick(n)} className={`${tile(n === value)} max-sm:h-11`}>
          {n}
        </button>
      ))}
    </div>
  );
}
