import type { ReactNode } from "react";

const TITLE = "text-[16px] leading-[1.5] font-semibold tracking-[0.2px] text-ink";
const DM = { fontVariationSettings: '"opsz" 14' };

/**
 * A titled block of a detail page — the talent profile's Bio, Workplace Tags and Skills, the job
 * page's About the role and Work style — kept to a 768px column so the copy stays readable.
 */
export function Section({
  title,
  edit,
  editor,
  action,
  children,
}: {
  title: string;
  /** An edit pencil right beside the title (Create Role's Line). */
  edit?: ReactNode;
  /** An EditPanel standing in for the whole section while it's edited — it carries the title itself. */
  editor?: ReactNode;
  /** Anything else on the title row, on its right (History's rating). */
  action?: ReactNode;
  children: ReactNode;
}) {
  if (editor) return <section className="max-w-[768px]">{editor}</section>;
  return (
    <section className="flex max-w-[768px] flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h3 className={TITLE}>{title}</h3>
          {edit}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

/**
 * Contra's stat strip: the facts read at a glance before the detail — a profile's
 * rate, experience and rating, a job's pay, length, hours, level and seats. Each cell is its value
 * over a small label. Where they don't fit on one line the cells wrap onto another rather than cut
 * the values short; the 1px gaps over the rule colour draw the dividers either way. `sm` is the
 * same strip for a side column (the application page's details card).
 */
export function FactStrip({ cells, size = "md", className = "" }: { cells: { label: string; value: ReactNode }[]; size?: "md" | "sm"; className?: string }) {
  const sm = size === "sm";
  return (
    <dl className={`flex w-full flex-wrap gap-px overflow-hidden rounded-lg bg-[#e5e5e5] outline -outline-offset-1 outline-border ${className}`}>
      {cells.map((c) => (
        <div key={c.label} className={`flex min-w-0 flex-col-reverse gap-1 bg-white ${sm ? "flex-[1_1_104px] px-3 py-2.5" : "flex-[1_1_132px] px-4 py-3"}`}>
          <dt className="truncate text-[12px] leading-[1.2] tracking-[0.2px] text-ink-2">{c.label}</dt>
          <dd className={`flex items-center gap-1 truncate font-display leading-[1.3] font-semibold text-ink ${sm ? "text-[15px]" : "text-[18px]"}`} style={DM}>
            {c.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * A page's side column beside its main one (a contract's Overview, Contract & payment, Evaluation):
 * 38% of the width, kept between 360 and 520px, under the main column on a narrow screen. It was
 * a fixed 360px, so on a wide screen the main column took ~900px of mostly air while the side cards
 * (the score, the company and its badges) were squeezed into three rows; at a third, capped at
 * 440px, the main column's lists still ran wider than they needed while the score's bars were short.
 */
export const SIDE_COLUMN = "flex w-[clamp(360px,38%,520px)] shrink-0 flex-col gap-4 max-lg:w-full";
/** The row that holds the main column and SIDE_COLUMN: side by side, stacked on a narrow screen. */
export const WITH_SIDE = "flex items-start gap-6 max-lg:flex-col";
