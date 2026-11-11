import type { CSSProperties, ReactNode } from "react";
import { Card } from "@/components/kit/card";

/**
 * Grid cells: every direct child of a header or row is a cell. Each one stretches to the full row
 * height, and `content-center` centres it vertically while keeping it a block, so `truncate` and
 * `text-right` still work inside. `items-center` only affects cells that are themselves flex rows
 * (a stacked cell asks for `!items-start`). Rows are split by a light rule and columns by space
 * alone: a rule between every cell read as a spreadsheet. A cell that wants to fill edge to edge (a
 * coloured stat) opts out of the padding with `!p-0`.
 */
const CELLS = "[&>*]:self-stretch [&>*]:content-center [&>*]:items-center [&>*]:px-3 [&>*]:py-3";

/**
 * The narrowest a table can be before its columns crowd: its fixed widths (`w-[Npx]`), plus each
 * flexible column's floor (`min-w-[Npx]`, or 200px without one). Wider than that the flexible
 * columns take the room; narrower, the table scrolls sideways.
 */
function minWidthOf(cols: string[]) {
  return cols.reduce((sum, c) => sum + Number(c.match(/(?:^|\s)w-\[(\d+)px\]/)?.[1] ?? c.match(/min-w-\[(\d+)px\]/)?.[1] ?? 200), 0);
}

/**
 * A table as a grid. `cols` are Tailwind width classes. On a phone it isn't a grid any more: the
 * heading row goes and each row is a small card whose cells wrap onto lines (Row), so nothing waits
 * off to the right behind a sideways scroll. A page orders or stresses its cells there with
 * `max-md:` classes in `cols` (the contract first, the amount bold).
 */
export function Table({ cols, head, toolbar, title, semantic, children }: { cols: string[]; head: string[]; toolbar?: ReactNode; /** The table's name, as the heading on its card. */ title?: string; semantic?: boolean; children: ReactNode }) {
  return (
    <Card title={title} trayClassName="w-full min-w-0">
      {toolbar && <div className="px-3 py-3 md:border-b md:border-line">{toolbar}</div>}
      <TableContent cols={cols} head={head} semantic={semantic} label={title}>{children}</TableContent>
    </Card>
  );
}

/**
 * Table rows and headers inside an existing panel. `semantic` marks it up as a table for screen
 * readers (the table, its header row and column headers); its rows then take `role="row"` and each
 * of their cells `role="cell"`, as a table built from data does (Admin's DataTable).
 */
export function TableContent({ cols, head, children, semantic = false, label }: { cols: string[]; head: string[]; children: ReactNode; semantic?: boolean; /** Names a `semantic` table. */ label?: string }) {
  return (
    // It sized itself to its longest text (min-w-max), so payments and offers scrolled sideways on
    // a laptop whatever room they had. It fills the page now, and only scrolls once the page is
    // narrower than its columns need — which still keeps a narrow pane from crushing them together.
    <div className="overflow-x-auto rounded-[inherit]">
      <div role={semantic ? "table" : undefined} aria-label={semantic ? label : undefined} style={{ "--table-min": `${minWidthOf(cols)}px` } as CSSProperties} className="md:min-w-(--table-min)">
        {head.length > 0 && (
          <div role={semantic ? "row" : undefined} className={`flex text-[12px] leading-[1.4] font-medium whitespace-nowrap text-ink-2 max-md:hidden ${CELLS}`}>
            {head.map((h, i) => (
              <span key={h} role={semantic ? "columnheader" : undefined} className={`${cols[i]} truncate`}>
                {h}
              </span>
            ))}
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

/**
 * On a phone a row's cells drop their column widths and wrap, a small card per row (Table). A page
 * lays a cell out differently there with `max-md:…!` in its column: the name on a line of its own
 * (`max-md:basis-full!`), the amount pushed right (`max-md:ml-auto`).
 */
const PHONE_ROW =
  "max-md:flex-wrap max-md:items-center max-md:gap-x-3 max-md:gap-y-1.5 max-md:p-3 max-md:whitespace-normal max-md:[&>*]:w-auto max-md:[&>*]:min-w-0 max-md:[&>*]:max-w-full max-md:[&>*]:grow-0 max-md:[&>*]:basis-auto max-md:[&>*]:p-0!";

export function Row({ children, className = "", role }: { children: ReactNode; className?: string; /** "row", in a `semantic` table. */ role?: "row" }) {
  return <div role={role} className={`flex border-t border-line text-[13px] leading-[1.4] whitespace-nowrap text-ink hover:bg-surface-alt ${CELLS} ${PHONE_ROW} ${className}`}>{children}</div>;
}
