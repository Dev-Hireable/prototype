"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** Below Tailwind's `md`, where a board shows a column at a time with its chips (KanbanJump). */
const PHONE = "(width < 48rem)";

/**
 * A kanban board's way to a column: `jumpTo` scrolls the board (by hand rather than scrollIntoView,
 * which would also scroll the page) so the column sits as near the middle as the scroll range allows,
 * and `current` is the column most in view, which the phone's chips light up. `board` goes on the
 * board's scroller as its ref; each column carries `data-column` with its key. On a phone the board
 * opens at `start` (its first column with anything in it), not on empty columns the user has to
 * swipe past to find their cards.
 */
export function useBoardJump(start: string | null) {
  const [board, setBoard] = useState<HTMLElement | null>(null);
  const [current, setCurrent] = useState<string | null>(null);
  const opened = useRef(false);
  /** Whether the column was there to scroll to. */
  const jumpTo = useCallback(
    (key: string, behavior: ScrollBehavior = "smooth") => {
      const el = board?.querySelector<HTMLElement>(`[data-column="${CSS.escape(key)}"]`);
      if (!board || !el) return false;
      const col = el.getBoundingClientRect();
      const box = board.getBoundingClientRect();
      board.scrollTo({ left: board.scrollLeft + col.left - box.left - (board.clientWidth - col.width) / 2, behavior });
      return true;
    },
    [board],
  );
  useEffect(() => {
    if (!board) return;
    let frame = 0;
    const measure = () => {
      frame = 0;
      setCurrent(columnInView(board));
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };
    onScroll();
    board.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      board.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, [board]);
  useEffect(() => {
    if (!board || !start || opened.current || !matchMedia(PHONE).matches) return;
    // Next frame, once the columns have their widths; once only, so it never pulls a swipe back.
    const frame = requestAnimationFrame(() => {
      opened.current = jumpTo(start, "instant");
    });
    return () => cancelAnimationFrame(frame);
  }, [board, start, jumpTo]);
  return { board: setBoard, jumpTo, current };
}

/** The column whose middle is nearest the middle of what the board shows. */
function columnInView(board: HTMLElement) {
  const box = board.getBoundingClientRect();
  const mid = box.left + board.clientWidth / 2;
  let best: string | null = null;
  let gap = Infinity;
  for (const el of board.querySelectorAll<HTMLElement>("[data-column]")) {
    const r = el.getBoundingClientRect();
    const d = Math.abs(r.left + r.width / 2 - mid);
    if (d < gap) [best, gap] = [el.dataset.column ?? null, d];
  }
  return best;
}
