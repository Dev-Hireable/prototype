import { ICONS } from "@/components/icons";

const Star = ICONS.star;

/**
 * A 1–5 rating, the same wherever an evaluation shows (the contract pages, the profile's reviews):
 * Earned stars have a warm edge.
 */
export function Stars({ value, size = 20 }: { value: number; size?: number }) {
  return (
    <span role="img" aria-label={`${value} out of 5 stars`} className="inline-flex shrink-0 items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          size={size}
          aria-hidden
          className={n <= value ? "text-[#ffc247] drop-shadow-[0_1px_0_#bd6d21]" : "text-line"}
        />
      ))}
    </span>
  );
}
