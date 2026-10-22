import { useCallback, useEffect, useRef, useState, type DragEvent } from "react";
import { uiZoom } from "@/lib/portal/zoom";
import type { WorkItem } from "@/lib/work/model";
import { liftCard, preloadDragImage } from "./drag-preview";

/*
 * Picking a card up and putting it down wherever work is dragged into place: the Board's columns
 * and the dashboards' My tasks. The card lifts out as a solid copy under the pointer, the others
 * part where it would land, and the slot is read from where the pointer is. One set of rules, so a
 * drag looks and lands the same everywhere.
 */

/** A list cards are dragged within: a Board column, or My tasks' one list. */
type DragList = { key: string; items: readonly WorkItem[] };

/** The card being dragged, the list it was picked up from, and the room it takes in a list (its height and the gap after it). */
export type Dragging = { id: string; from: string; room: number };

/** The list the dragged card is over, and the slot in it where it would land. */
type Over = { key: string; index: number };

/**
 * A card on the move: which one and the list it left, the list and slot it's over, and when it
 * lifts out of its place. However the drag ends, it clears the lot, and `onEnd` clears whatever the
 * caller showed for it (the Board's refusal hint).
 */
export function useCardDrag(lists: readonly DragList[], byId: ReadonlyMap<string, WorkItem>, onEnd?: () => void) {
  const [drag, setDrag] = useState<Dragging | null>(null);
  /** The card being dragged leaves its place once its solid copy is up under the pointer. */
  const [lifted, setLifted] = useState<string | null>(null);
  const [over, setOver] = useState<Over | null>(null);
  /** Puts the copy following the pointer away. */
  const putAway = useRef<(() => void) | null>(null);
  const listOf = useCallback((id: string) => lists.find((g) => g.items.some((t) => t.id === id)), [lists]);
  useEffect(preloadDragImage, []);

  const onDragStart = useCallback(
    (t: WorkItem, e: DragEvent) => {
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", t.id);
      putAway.current?.();
      putAway.current = liftCard(e.currentTarget as HTMLElement, e.nativeEvent);
      const from = listOf(t.id);
      setDrag({ id: t.id, from: from?.key ?? "", room: roomOf(e.currentTarget as HTMLElement) });
      setTimeout(() => {
        setLifted(t.id);
        // Its slot stays open where it was, so nothing jumps as it lifts out; it closes once the card leaves the list.
        if (from) setOver({ key: from.key, index: from.items.findIndex((x) => x.id === t.id) });
      }, 0);
    },
    [listOf],
  );

  const onDragEnd = useCallback(() => {
    putAway.current?.();
    putAway.current = null;
    setDrag(null);
    setLifted(null);
    setOver(null);
    onEnd?.();
  }, [onEnd]);

  return { drag, dragged: drag ? byId.get(drag.id) : undefined, lifted, over, setOver, onDragStart, onDragEnd };
}

export type CardDrag = ReturnType<typeof useCardDrag>;

/** The room a card takes in its list: its height and the gap after it, what the others part by to let it in. */
function roomOf(card: HTMLElement) {
  const li = card.closest("li") ?? card;
  const list = li.parentElement;
  return li.offsetHeight + (list ? parseFloat(getComputedStyle(list).rowGap) || 0 : 0);
}

/**
 * The slot a card dragged to height `y` lands in: after every other card in the list whose middle
 * is above it. Measured where each card rests, not where it's sliding to make room, or the room
 * opening would move the slot it opened for. Cards that aren't drawn (past My tasks' five) don't count.
 */
export function slotAt(items: readonly WorkItem[], y: number, dragId: string | undefined, cards: ReadonlyMap<string, HTMLElement>) {
  let i = 0;
  for (const t of items) {
    if (t.id === dragId) continue;
    const el = cards.get(t.id);
    if (!el) continue;
    const r = el.getBoundingClientRect();
    // The slide is a CSS length, drawn at the app's scale; the rect is in screen pixels.
    const slid = new DOMMatrixReadOnly(getComputedStyle(el.closest("li") ?? el).transform).m42 * uiZoom();
    if (y > r.top - slid + r.height / 2) i++;
  }
  return i;
}
