import { ICONS } from "@/components/icons";

const Star = ICONS.star;

/**
 * A 1–5 rating, the same wherever an evaluation shows (the contract pages, the profile's reviews):
 * the stars given in amber, the rest in grey, read out as "4 out of 5 stars". `size` is each star's.
 */
export function Stars({ value, size = 16 }: { value: number; size?: number }) {
  return (
    <span role="img" aria-label={`${value} out of 5 stars`} className="flex items-center gap-[2.667px]">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} size={size} aria-hidden className={n <= value ? "text-[#f2c94c]" : "text-[#d8d8d8]"} />
      ))}
    </span>
  );
}
