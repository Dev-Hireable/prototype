import Link from "next/link";
import type { ReactNode } from "react";
import { PortalContent } from "@/components/portal/layout";
import { ScrollFade } from "@/components/portal/ScrollFade";
import { ICONS } from "./icons";

/* ---------------------------------------------------------------- page ---- */

/** Figma "Header": pt 16 / px 16, border-b #c3c3c3, title DM Sans 24 SemiBold, lh 1.5, opsz 14. */
export function AdminPage({
  title,
  actions,
  children,
}: {
  title: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <>
      <header className="flex shrink-0 items-center justify-between gap-2 px-4 pt-4 shadow-[inset_0_-1px_0_#c3c3c3]">
        <h1
          className="truncate font-display text-[24px] leading-[1.5] font-semibold tracking-[0.2px] text-ink"
          style={{ fontVariationSettings: '"opsz" 14' }}
        >
          {title}
        </h1>
        {actions && <div className="flex shrink-0 items-center gap-2 pb-2">{actions}</div>}
      </header>
      {/* Gutter trimmed from the Figma 16/16/24 so the board breathes; it sits on this wrapper, not
          on the scroller, so nothing scrolls through it. Content is capped at the shared 1200px
          desktop width and centred so cards never stretch on ultra-wide screens. */}
      <div className="flex min-h-0 flex-1 px-2 pt-2 pb-3">
        <ScrollFade className="flex w-full min-w-0">
          <div className="w-full overflow-y-auto">
            <PortalContent>{children}</PortalContent>
          </div>
        </ScrollFade>
      </div>
    </>
  );
}

/** Shared with the portal shells so a back link is the same size everywhere in the app. */
export { BackLink } from "@/components/portal/nav";

/* -------------------------------------------------------------- surfaces -- */

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-lg bg-white outline -outline-offset-1 outline-line ${className}`}>{children}</section>;
}

/** Figma stat card: p 18, gap 4, label 12.5 / value 24 SemiBold −0.48 / sub 11.5, lh 1.45. */
export function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Card className="flex min-w-0 flex-1 flex-col gap-1 overflow-clip p-[18px] leading-[1.45] whitespace-nowrap">
      <p className="text-[12.5px] text-muted">{label}</p>
      <p className="text-[24px] font-semibold tracking-[-0.48px] text-ink-deep">{value}</p>
      {sub && <p className="text-[11.5px] text-muted">{sub}</p>}
    </Card>
  );
}

export function StatGrid({ children }: { children: ReactNode }) {
  return <div className="flex w-full gap-4">{children}</div>;
}

/* ---------------------------------------------------------------- badge --- */

export type Tone = "warn" | "ok" | "danger" | "accent" | "neutral" | "trial";

/** warn/ok/danger sampled from the Figma renders; the rest follow the same recipe. */
const TONES: Record<Tone, string> = {
  warn: "bg-warn-bg text-warn",
  ok: "bg-[#eef9f2] text-ok",
  danger: "bg-[#fcf2f2] text-[#eb5757]",
  accent: "bg-accent-bg text-accent",
  neutral: "bg-surface-alt text-muted",
  trial: "bg-[#fff3e8] text-[#f08a24]",
};

/** Figma "Badge with dot": h 24, px 8, gap 4, radius 4, 6px dot @ 76 %, Inter Medium 12 / 0.2. */
export function Badge({ tone = "neutral", children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span
      className={`inline-flex h-6 items-center justify-center gap-1 rounded px-2 py-1 text-[12px] leading-[1.2] font-medium tracking-[0.2px] whitespace-nowrap ${TONES[tone]}`}
    >
      <span aria-hidden className="size-1.5 rounded-full bg-current opacity-[.76]" />
      {children}
    </span>
  );
}

/* -------------------------------------------------------------- controls -- */
/* The list-screen toolbar is measured from renders, not from design context (see summary). */

export function Toolbar({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-center gap-4">{children}</div>;
}

export function SearchInput({ placeholder }: { placeholder: string }) {
  const SearchIcon = ICONS.search;
  return (
    <label className="flex h-11 w-[316px] items-center gap-2 rounded-lg border border-border bg-white px-4 text-ink-2">
      <SearchIcon size={18} aria-hidden />
      <input
        type="search"
        placeholder={placeholder}
        className="min-w-0 flex-1 bg-transparent text-[13px] text-ink outline-none placeholder:text-ink-2"
      />
    </label>
  );
}

export function Select({ label, options }: { label: string; options: string[] }) {
  const Chevron = ICONS.chevron;
  return (
    <label className="relative block">
      <span className="sr-only">{label}</span>
      <select
        defaultValue={options[0]}
        className="h-11 w-[180px] appearance-none rounded-lg border border-border bg-white pr-10 pl-4 text-[13px] text-ink-2 outline-none"
      >
        {options.map((o) => (
          <option key={o}>{o}</option>
        ))}
      </select>
      <Chevron size={20} aria-hidden className="pointer-events-none absolute top-3 right-3 text-ink" />
    </label>
  );
}

export function Button({
  children,
  variant = "secondary",
}: {
  children: ReactNode;
  variant?: "primary" | "secondary" | "danger";
}) {
  const styles = {
    primary: "bg-accent text-white",
    secondary: "border border-border text-ink",
    danger: "border border-[#f4a4a4] text-[#eb5757]",
  }[variant];
  return (
    <button
      type="button"
      className={`h-9 rounded-lg px-4 text-[13px] leading-none font-semibold tracking-[0.2px] whitespace-nowrap ${styles}`}
    >
      {children}
    </button>
  );
}

/* ---------------------------------------------------------------- table --- */

export type Column<T> = {
  header: string;
  cell: (row: T) => ReactNode;
  /** px (number) as in the Figma fixed columns, or any CSS width; omit for the flexible column. */
  width?: number | string;
  align?: "right";
};

/**
 * Figma "Needs attention" table:
 *   caption  px 16 / py 14, Inter SemiBold 14, #141a21
 *   head     bg #f9fafb, border-t #e3e8ed, px 16 / py 10, Inter SemiBold 11.5, #737d8a
 *   rows     border-t #e3e8ed, px 16 / py 13, Inter 13 lh 1.45; first cell #141a21, rest #737d8a;
 *            even rows #fcfdfe
 */
export function DataTable<T>({
  caption,
  columns,
  rows,
  rowHref,
  empty = "Nothing here yet.",
}: {
  caption?: string;
  columns: Column<T>[];
  rows: T[];
  rowHref?: (row: T) => string;
  empty?: string;
}) {
  return (
    <Card className="overflow-clip">
      {caption && (
        <h2 className="px-4 py-[14px] text-[14px] leading-[1.45] font-semibold whitespace-nowrap text-ink-deep">
          {caption}
        </h2>
      )}
      <div className="overflow-x-auto">
        <table className="w-full table-fixed border-separate border-spacing-0">
          <colgroup>
            {columns.map((c, j) => (
              <col
                key={c.header}
                style={{
                  width:
                    c.width === undefined
                      ? undefined
                      : typeof c.width === "number"
                        ? c.width + (j === columns.length - 1 ? 16 : 0)
                        : c.width,
                }}
              />
            ))}
          </colgroup>
          <thead>
            <tr className="bg-surface-alt text-left">
              {columns.map((c) => (
                <th
                  key={c.header}
                  scope="col"
                  className={`py-[10px] shadow-[inset_0_1px_0_#e3e8ed] text-[11.5px] leading-[1.45] font-semibold whitespace-nowrap text-muted first:pl-4 last:pr-4 ${
                    c.align === "right" ? "text-right" : ""
                  }`}
                >
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="px-4 py-10 text-center shadow-[inset_0_1px_0_#e3e8ed] text-[13px] text-muted">
                  {empty}
                </td>
              </tr>
            )}
            {rows.map((row, i) => (
              <tr key={i} className="bg-white even:bg-row-alt">
                {columns.map((c, j) => (
                  <td
                    key={c.header}
                    className={`py-[13px] shadow-[inset_0_1px_0_#e3e8ed] align-middle text-[13px] leading-[1.45] break-words first:pl-4 last:pr-4 ${
                      c.align === "right" ? "text-right" : ""
                    } ${j === 0 ? "text-ink-deep" : "text-muted"}`}
                  >
                    {j === 0 && rowHref ? <Link href={rowHref(row)}>{c.cell(row)}</Link> : c.cell(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
