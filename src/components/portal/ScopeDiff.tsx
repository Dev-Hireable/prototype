import type { ReactNode } from "react";
import { Badge } from "@/components/portal/Badge";
import { keyed } from "@/lib/portal/keys";
import { wordDiff } from "@/lib/work/word-diff";

/**
 * How a change to agreed scope reads, the same for an offer's revision and a contract amendment:
 * each change is a row with what happened to it (Added, Removed, Changed), and a changed value shows
 * as it was and as proposed — text as tracked changes, words taken out struck through, words put in
 * underlined — so nobody has to compare two versions by eye.
 */

export type ChangeKind = "added" | "removed" | "changed";

const KIND: Record<ChangeKind, { label: string; tone: "ok" | "danger" | "info" }> = {
  added: { label: "Added", tone: "ok" },
  removed: { label: "Removed", tone: "danger" },
  changed: { label: "Changed", tone: "info" },
};

/** One change: what happened to it, what it's about, and the details under it. */
export function ChangeRow({ kind, title, meta, children }: { kind: ChangeKind; title: ReactNode; meta?: ReactNode; children?: ReactNode }) {
  return (
    <li className="flex flex-col gap-2 border-t border-[#eeeeee] py-3 first:border-t-0 first:pt-0 last:pb-0">
      <div className="flex flex-wrap items-start gap-2">
        <Badge tone={KIND[kind].tone}>{KIND[kind].label}</Badge>
        <span className={`min-w-0 flex-1 text-[14px] leading-6 font-medium [overflow-wrap:anywhere] ${kind === "removed" ? "text-ink-2 line-through" : "text-ink"}`}>{title}</span>
        {meta && <span className="text-[12.5px] leading-6 text-ink-2">{meta}</span>}
      </div>
      {children && <div className="flex flex-col gap-2 pl-1">{children}</div>}
    </li>
  );
}

/** Rows of changes, one under the other. */
export function ChangeList({ children, label }: { children: ReactNode; label: string }) {
  return (
    <ul aria-label={label} className="flex flex-col">
      {children}
    </ul>
  );
}

/** A value before and after: "Previous" struck through, "Proposed" in full. */
export function ValueChange({ label, was, to }: { label?: string; was: ReactNode; to: ReactNode }) {
  return (
    <dl className="grid grid-cols-[max-content_minmax(0,1fr)] gap-x-3 gap-y-1 rounded-md bg-surface-2 px-3 py-2 text-[13px] leading-[1.45]">
      {label && <dt className="col-span-2 font-medium text-ink">{label}</dt>}
      <dt className="text-ink-2">Previous</dt>
      <dd className="text-ink-2 line-through [overflow-wrap:anywhere]">{was}</dd>
      <dt className="text-ink-2">Proposed</dt>
      <dd className="font-medium text-ink [overflow-wrap:anywhere]">{to}</dd>
    </dl>
  );
}

/** A text before and after as tracked changes: taken out struck through, put in underlined. */
export function TextChange({ label, was, to }: { label: string; was: string; to: string }) {
  const parts = wordDiff(was, to);
  return (
    <div className="flex flex-col gap-1 rounded-md bg-surface-2 px-3 py-2 text-[13px] leading-[1.5]">
      <span className="font-medium text-ink">{label}</span>
      <p className="whitespace-pre-line text-ink [overflow-wrap:anywhere]">
        {parts.length === 0 && <span className="text-ink-2">None</span>}
        {keyed(parts, (p) => `${p.op}:${p.text}`).map(({ item: p, key }) =>
          p.op === "same" ? (
            <span key={key}>{p.text}</span>
          ) : p.op === "del" ? (
            <del key={key} className="rounded-sm bg-[#fcf2f2] text-danger">
              {p.text}
            </del>
          ) : (
            <ins key={key} className="rounded-sm bg-[#eef9f2] text-ok underline decoration-1 underline-offset-2">
              {p.text}
            </ins>
          ),
        )}
      </p>
    </div>
  );
}
