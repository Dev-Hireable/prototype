"use client";

import { type ReactNode, type RefObject, useRef } from "react";
import { ICONS } from "@/components/icons";
import { tabStops } from "@/components/kit/modal";
import { ICON_BUTTON } from "@/components/kit/styles";
import { Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle, useSheetSide } from "@/components/ui/sheet";

/** The drawer's close button, and where its focus starts on opening (see `initialFocus` on Drawer). */
function useDrawerFocus(initialFocus: "first" | "close" | RefObject<HTMLElement | null>) {
  const closeRef = useRef<HTMLButtonElement>(null);
  /** The close leads the header, so "first" means the first control after it — or one that took the focus itself (autoFocus). */
  const first = () => {
    const sheet = closeRef.current?.closest<HTMLElement>('[data-slot="sheet-content"]');
    if (!sheet) return closeRef.current;
    const held = document.activeElement;
    if (held instanceof HTMLElement && held !== closeRef.current && sheet.contains(held)) return held;
    return tabStops(sheet).find((el) => el !== closeRef.current) ?? closeRef.current;
  };
  const start = initialFocus === "first" ? first : initialFocus === "close" ? closeRef : () => initialFocus.current ?? closeRef.current;
  return { closeRef, start };
}

/**
 * A drawer (800 wide, right-anchored) on shadcn's Sheet, so it slides in and out — it used to
 * mount and unmount in a single frame. A title row led by the close (», top left), then a scrolling body. The Sheet
 * portals, traps focus and closes on Escape or a click outside.
 *
 * `header` swaps the visible title for other content in that row (the title stays the dialog's
 * accessible name), `actions` sit at the row's right end, `subheader` spans the width under the row,
 * and `footer` pins below the body — the task sheet uses all four: its status and next step in the
 * row, the step's note under it. A `header` may wrap onto a second line on a phone, so its row aligns
 * to the top, with the close and the actions centred on its first 36px line, and a hairline under
 * the whole header: the body scrolls beneath it.
 *
 * Opening moves the focus to the first control inside, unless one was already focused (autoFocus).
 * `initialFocus="close"` starts on the close button instead — for a header whose first control is a
 * field, which shouldn't look mid-edit every time the sheet opens. A ref starts on its control, or on
 * the close button when that control isn't there — the task sheet, opened to set dates, starts on the
 * first date this person can change.
 */
export function Drawer({
  open,
  onClose,
  title,
  children,
  width = 800,
  header,
  actions,
  subheader,
  footer,
  testId,
  initialFocus = "first",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  width?: number;
  header?: ReactNode;
  actions?: ReactNode;
  subheader?: ReactNode;
  footer?: ReactNode;
  testId?: string;
  initialFocus?: "first" | "close" | RefObject<HTMLElement | null>;
}) {
  const { closeRef, start } = useDrawerFocus(initialFocus);
  return (
    <Sheet side="right" open={open} onOpenChange={(next) => !next && onClose()}>
      <SheetContent showCloseButton={false} initialFocus={start} className="gap-0 data-[side=right]:w-full" style={{ maxWidth: width }} data-testid={testId}>
        <SheetHeader className={`gap-3 px-6 ${header ? "border-b border-border py-4" : "py-5"}`}>
          <div className={`flex gap-3 ${header ? "items-start" : "items-center"}`}>
            {/* The close leads, top left, pointing the way the sheet slides out — the mirror of the
                sidebar's «. Beside a `header` it sits on the header's first 36px line. The negative
                margin gives the icon a hover box without making the row taller. */}
            <div className={`flex shrink-0 items-center ${header ? "h-9" : ""}`}>
              <SheetClose ref={closeRef} aria-label="Close" className={`${ICON_BUTTON} -m-1.5 size-8`}>
                <DrawerCloseGlyph />
              </SheetClose>
            </div>
            {header ? (
              <>
                <SheetTitle className="sr-only">{title}</SheetTitle>
                <div className="flex min-w-0 flex-1 items-center gap-2">{header}</div>
              </>
            ) : (
              <SheetTitle className="min-w-0 flex-1 font-sans text-[18px] leading-[1.4] font-semibold text-ink">{title}</SheetTitle>
            )}
            {actions && <div className={`flex shrink-0 items-center gap-1 ${header ? "h-9" : ""}`}>{actions}</div>}
          </div>
          {subheader}
        </SheetHeader>
        {/* `relative`: an absolutely placed child (an sr-only label) stays inside the scroll rather than stretching the page. */}
        <div className="relative flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-6">{children}</div>
        {footer && <div className="shrink-0 border-t border-line px-6 py-3">{footer}</div>}
      </SheetContent>
    </Sheet>
  );
}

/** The close's glyph points the way the sheet leaves: », or down where a phone shows it as a bottom sheet. */
function DrawerCloseGlyph() {
  const Glyph = useSheetSide() === "bottom" ? ICONS.chevron : ICONS.sheetClose;
  return <Glyph size={20} aria-hidden />;
}
