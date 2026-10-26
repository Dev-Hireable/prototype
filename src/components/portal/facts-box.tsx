import type { ReactNode } from "react";

export type Fact = readonly [string, ReactNode];

/**
 * A grey box of key facts, a label and its value a line each: a role's posted terms (beside the
 * proposal, and in the proposal under review) and a transaction's detail in the wallet. Terms set the
 * value at the right of its line; `columns` puts the labels in a column of their own instead, for
 * values long enough to wrap (a reference, a contract's name). `valueClassName` styles a value by its
 * label (the role's name as a link).
 */
export function FactsBox({ rows, columns = false, valueClassName }: { rows: readonly Fact[]; columns?: boolean; valueClassName?: (label: string) => string }) {
  const tone = (k: string) => valueClassName?.(k) ?? "text-ink";
  return (
    <dl className={`flex flex-col rounded-lg bg-surface-2 outline -outline-offset-1 outline-border ${columns ? "gap-2 p-4 text-[13px] leading-[1.45]" : "gap-3 p-3"}`}>
      {rows.map(([k, v]) =>
        columns ? (
          <div key={k} className="flex gap-4">
            <dt className="w-[130px] shrink-0 text-ink-2">{k}</dt>
            <dd className={`min-w-0 flex-1 ${tone(k)}`}>{v}</dd>
          </div>
        ) : (
          <div key={k} className="flex h-5 items-center justify-between gap-4">
            <dt className="font-semibold whitespace-nowrap text-ink-2">{k}</dt>
            <dd className={`truncate ${tone(k)}`}>{v}</dd>
          </div>
        ),
      )}
    </dl>
  );
}
