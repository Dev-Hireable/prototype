"use client";

import { ICONS } from "@/components/icons";

/**
 * TB-012 — the page numbers come from the real result count and Previous/Next actually move.
 */
export function Pagination({ page, pages, onChange }: { page: number; pages: number; onChange: (p: number) => void }) {
  const Prev = ICONS.chevronLeft;
  const Next = ICONS.chevronRight;
  if (pages <= 1) return null;

  // Up to 3 numbers around the current page, with an ellipsis before the last when they don't meet.
  const start = Math.max(1, Math.min(page - 1, pages - 2));
  const window = [start, start + 1, start + 2].filter((p) => p >= 1 && p <= pages);
  const items: (number | "…")[] = window.includes(pages) ? window : [...window, ...(window.at(-1)! < pages - 1 ? (["…"] as const) : []), pages];

  return (
    <nav aria-label="Pagination" className="flex items-center justify-center gap-2 text-[14px] leading-[1.4] font-medium text-ink">
      <button type="button" onClick={() => onChange(page - 1)} disabled={page === 1} className="flex items-center gap-1 font-normal text-ink-2 disabled:text-ink-disabled">
        <Prev size={18} aria-hidden /> Previous
      </button>
      {items.map((p, i) =>
        p === "…" ? (
          <span key={`gap${i}`} className="px-1 text-ink-2">
            …
          </span>
        ) : (
          <button key={p} type="button" onClick={() => onChange(p)} aria-current={p === page ? "page" : undefined} className={`rounded-md px-2.5 py-1.5 ${p === page ? "bg-primary text-white" : "hover:bg-surface-alt"}`}>
            {p}
          </button>
        ),
      )}
      <button type="button" onClick={() => onChange(page + 1)} disabled={page === pages} className="flex items-center gap-1 font-normal text-ink-2 disabled:text-ink-disabled">
        Next <Next size={18} aria-hidden />
      </button>
    </nav>
  );
}
