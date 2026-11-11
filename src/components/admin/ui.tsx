import type { ReactNode } from "react";
import { Row, Table } from "@/components/kit/table";
import { TextLink } from "@/components/kit/text-link";
import { TRAY, TRAY_FOOT, TRAY_PANEL } from "@/components/kit/styles";
import { keyed } from "@/lib/portal/keys";

/* -------------------------------------------------------------- surfaces -- */
/* What only Admin draws: its stat cards, and the kit's Table filled from data (DataTable). The page
   frame, cards, badges, buttons, toolbar, search, select and the table itself are the one kit's
   (@/components/kit); Admin had copies of each. See docs/design-system.md. */

export function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    // The card look every card shares: the figure on the white panel, what it's out of on the grey tray under it.
    <section className={`flex min-w-0 flex-1 flex-col leading-[1.45] whitespace-nowrap max-lg:basis-[150px] max-lg:whitespace-normal ${TRAY}`}>
      <div className={`flex flex-col gap-1 overflow-clip px-[14px] py-3 ${TRAY_PANEL}`}>
        <p className="text-[12.5px] text-muted">{label}</p>
        <p className="text-[24px] font-semibold tracking-[-0.48px] text-ink-deep">{value}</p>
      </div>
      {sub && <p className={`text-[11.5px] text-muted ${TRAY_FOOT}`}>{sub}</p>}
    </section>
  );
}

export function StatGrid({ children }: { children: ReactNode }) {
  // A tablet or a phone wraps the cards two to a row.
  return <div className="flex w-full gap-4 max-lg:flex-wrap max-lg:gap-3">{children}</div>;
}

/* ---------------------------------------------------------------- table --- */

export type Column<T> = {
  header: string;
  cell: (row: T) => ReactNode;
  /**
   * The column's width, as the kit's Table takes it: Tailwind classes. `w-[130px]` is a fixed
   * width; `min-w-[160px] flex-[2]` a share of the room that's left, never narrower than its
   * minimum. Left out, the column takes the room that's left.
   */
  col?: string;
  align?: "right";
};

/** A column with no width of its own. */
const FLEXIBLE = "min-w-[180px] flex-1";

/** A cell on a desktop: its text wraps inside its column rather than running under the next one. */
const CELL = "min-w-0 whitespace-normal [overflow-wrap:anywhere]";
/** On a phone a row is a card (Row): its first cell the title, on a line of its own... */
const PHONE_TITLE = "max-md:basis-full! max-md:text-[14px] max-md:font-semibold";
/** ...and every other cell a line of its own, the column's name at its left and the value at its right. */
const PHONE_LINE =
  "max-md:flex max-md:basis-full! max-md:justify-between max-md:gap-4 max-md:text-right max-md:before:shrink-0 max-md:before:text-left max-md:before:text-[12px] max-md:before:text-ink-2 max-md:before:content-[attr(data-label)]";

/** A row's key when it has no link to key by: its text and numbers (the records carry no id). */
const rowText = (row: unknown) => (row && typeof row === "object" ? Object.values(row).filter((v) => typeof v === "string" || typeof v === "number").join("|") : String(row));

/**
 * The kit's Table, filled from data: a list of columns and the rows to draw them for, instead of a
 * Row written out per record. It is the same table as the portals' (the same card, header, rows and
 * phone cards), marked up as a table for screen readers. The first cell of each row links to the
 * row's page when rows have one (`rowHref`); with no rows, one line says so (`empty`).
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
  const cols = columns.map((c) => `${c.col ?? FLEXIBLE}${c.align === "right" ? " text-right" : ""}`);
  return (
    <Table title={caption} cols={cols} head={columns.map((c) => c.header)} semantic>
      {rows.length === 0 && (
        <Row role="row" className="hover:bg-transparent">
          <span role="cell" className="flex-1 py-10! text-center whitespace-normal text-ink-2 max-md:basis-full! max-md:py-6!">
            {empty}
          </span>
        </Row>
      )}
      {keyed(rows, (row) => rowHref?.(row) ?? rowText(row)).map(({ item: row, key }) => (
        <Row key={key} role="row">
          {columns.map((c, j) => (
            <span key={c.header} role="cell" data-label={c.header} className={`${cols[j]} ${CELL} ${j === 0 ? PHONE_TITLE : PHONE_LINE}`}>
              {j === 0 && rowHref ? (
                <TextLink href={rowHref(row)}>
                  {c.cell(row)}
                </TextLink>
              ) : (
                c.cell(row)
              )}
            </span>
          ))}
        </Row>
      ))}
    </Table>
  );
}
