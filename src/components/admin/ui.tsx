import Link from "next/link";
import type { ReactNode } from "react";
import { Card } from "@/components/portal/ui";
import { PortalContent } from "@/components/portal/layout";
import { PageNav } from "@/components/portal/nav";
import { ScrollFade } from "@/components/portal/scroll-fade";
import { CLEAR_DEMO_RESET } from "@/components/portal/styles";
import { keyed } from "@/lib/portal/keys";
import { ICONS } from "@/components/icons";

/* ---------------------------------------------------------------- page ---- */

export function AdminPage({
  title,
  actions,
  nav,
  children,
  bleed = false,
}: {
  title: string;
  actions?: ReactNode;
  /** A back link or breadcrumb: the same fixed row the portals give it, not a line in the content. */
  nav?: ReactNode;
  children: ReactNode;
  /**
   * The content takes the rest of the panel as a plain flex column and does its own scrolling (a
   * workspace) — no page scroller, no 1200px column, no edge fade over its sticky headers.
   */
  bleed?: boolean;
}) {
  return (
    <>
      {/* Ends short of the Reset demo button floating in the corner (CLEAR_DEMO_RESET). */}
      <header className={`flex shrink-0 items-center justify-between gap-2 pt-4 pl-4 ${CLEAR_DEMO_RESET} shadow-[inset_0_-1px_0_#c3c3c3]`}>
        <h1
          className="truncate font-display text-[24px] leading-[1.5] font-semibold tracking-[0.2px] text-ink"
          style={{ fontVariationSettings: '"opsz" 14' }}
        >
          {title}
        </h1>
        {actions && <div className="flex shrink-0 items-center gap-2 pb-2">{actions}</div>}
      </header>
      {/* The gutter sits on this wrapper, not on the scroller, so nothing scrolls through it. Content
          is capped at the shared 1200px desktop width and centred so cards never stretch on
          ultra-wide screens. */}
      {/* Pinned under the header in the page gutter, like the portals' Page, so it never moves. */}
      {nav && (
        <div className="shrink-0 px-4 pt-2">
          <PageNav>{nav}</PageNav>
        </div>
      )}
      {/* Side and bottom gutters are padding inside the scroller (see Page), so its scrollbar sits at
          the panel's edge and content fades out there. */}
      {bleed ? (
        <div className="flex min-h-0 min-w-0 flex-1 flex-col pt-2">{children}</div>
      ) : (
        <div className="flex min-h-0 flex-1 pt-2">
          <ScrollFade className="flex w-full min-w-0">
            <div className="edge-fade w-full overflow-y-auto px-2">
              <PortalContent className="pb-5">{children}</PortalContent>
            </div>
          </ScrollFade>
        </div>
      )}
    </>
  );
}

/* Back links and breadcrumbs: shadcn's Breadcrumb (@/components/ui/breadcrumb) and BreadcrumbBack
   (@/components/portal/nav), shared with the portals. */

/* -------------------------------------------------------------- surfaces -- */
/* Card, Badge (and its Tone) and Button are the portals' own — one kit: @/components/portal/ui
   and @/components/portal/Badge. Admin had copies of its own, with a lighter card edge and 13px
   semibold buttons in another blue. */

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

/* -------------------------------------------------------------- controls -- */

export function Toolbar({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-center gap-4">{children}</div>;
}

/** Uncontrolled unless `value`/`onChange` are passed — the static list screens don't filter yet. */
export function SearchInput({ placeholder, value, onChange }: { placeholder: string; value?: string; onChange?: (v: string) => void }) {
  const SearchIcon = ICONS.search;
  return (
    <label className="flex h-11 w-[316px] items-center gap-2 rounded-lg border border-border bg-white px-4 text-ink-2">
      <SearchIcon size={18} aria-hidden />
      <input
        type="search"
        placeholder={placeholder}
        {...(onChange ? { value: value ?? "", onChange: (e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value) } : {})}
        className="min-w-0 flex-1 bg-transparent text-[13px] text-ink outline-none placeholder:text-ink-2"
      />
    </label>
  );
}

export function Select({ label, options, value, onChange }: { label: string; options: string[]; value?: string; onChange?: (v: string) => void }) {
  const Chevron = ICONS.chevron;
  return (
    <label className="relative block">
      <span className="sr-only">{label}</span>
      <select
        {...(onChange ? { value: value ?? options[0], onChange: (e: React.ChangeEvent<HTMLSelectElement>) => onChange(e.target.value) } : { defaultValue: options[0] })}
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

/* ---------------------------------------------------------------- table --- */

export type Column<T> = {
  header: string;
  cell: (row: T) => ReactNode;
  /** px (number) or any CSS width; omit for the flexible column. */
  width?: number | string;
  align?: "right";
};

/**
 * Grid rules as inset shadows (the table is border-separate, so real borders would double up):
 * a top rule on every cell, plus a left rule on every cell after the first.
 */
const GRID = "px-4 shadow-[inset_0_1px_0_#e3e8ed] [&:not(:first-child)]:shadow-[inset_1px_1px_0_#e3e8ed]";
/** The narrowest the flexible (width-less) column may get before the table scrolls instead. */
const FLEX_MIN = 180;

/** A row's key when it has no link to key by: its text and numbers (the records carry no id). */
const rowText = (row: unknown) => (row && typeof row === "object" ? Object.values(row).filter((v) => typeof v === "string" || typeof v === "number").join("|") : String(row));

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
        {/* Column widths include their padding. Widening each by its 32px of padding left the one
            flexible column 32px wide at a 1280 window, so names broke a letter per line into 300px
            rows. The min-width keeps that column at least FLEX_MIN wide: a narrow window scrolls the
            table sideways instead of crushing it. */}
        <table
          className="w-full table-fixed border-separate border-spacing-0"
          style={{ minWidth: columns.reduce((n, c) => n + (typeof c.width === "number" ? c.width : 0), 0) + (columns.some((c) => c.width === undefined) ? FLEX_MIN : 0) }}
        >
          <colgroup>
            {columns.map((c) => (
              <col key={c.header} style={{ width: c.width }} />
            ))}
          </colgroup>
          <DataTableHead columns={columns} />
          <DataTableBody columns={columns} rows={rows} rowHref={rowHref} empty={empty} />
        </table>
      </div>
    </Card>
  );
}

/** The header row: each column's name, right-aligned over a right-aligned column. */
function DataTableHead<T>({ columns }: { columns: Column<T>[] }) {
  return (
    <thead>
      <tr className="bg-surface-alt text-left">
        {columns.map((c) => (
          <th
            key={c.header}
            scope="col"
            className={`${GRID} py-[10px] text-[11.5px] leading-[1.45] font-semibold whitespace-nowrap text-muted ${
              c.align === "right" ? "text-right" : ""
            }`}
          >
            {c.header}
          </th>
        ))}
      </tr>
    </thead>
  );
}

/**
 * The rows, the first cell of each a link to the row's page when rows have one (`rowHref`) — or,
 * with no rows, one full-width cell saying so (`empty`).
 */
function DataTableBody<T>({ columns, rows, rowHref, empty }: { columns: Column<T>[]; rows: T[]; rowHref?: (row: T) => string; empty: string }) {
  return (
    <tbody>
      {rows.length === 0 && (
        <tr>
          <td colSpan={columns.length} className="px-4 py-10 text-center shadow-[inset_0_1px_0_#e3e8ed] text-[13px] text-muted">
            {empty}
          </td>
        </tr>
      )}
      {keyed(rows, (row) => rowHref?.(row) ?? rowText(row)).map(({ item: row, key }) => (
        <tr key={key} className="bg-white even:bg-row-alt hover:bg-surface-alt">
          {columns.map((c, j) => (
            <td
              key={c.header}
              className={`${GRID} py-[13px] align-middle text-[13px] leading-[1.45] break-words ${
                c.align === "right" ? "text-right" : ""
              } ${j === 0 ? "text-ink-deep" : "text-muted"}`}
            >
              {j === 0 && rowHref ? <Link href={rowHref(row)}>{c.cell(row)}</Link> : c.cell(row)}
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  );
}
