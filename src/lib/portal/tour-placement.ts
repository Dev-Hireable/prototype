/**
 * Where a tour step's card goes: beside the highlighted element, on whichever side has room for it
 * — below first, then above, right, left — and always inside the window. A step with nothing to
 * highlight sits in the middle; one whose element leaves no room anywhere, on the window's edge.
 * Pure, so it's unit-tested.
 */

export type Box = { x: number; y: number; width: number; height: number };
export type Size = { width: number; height: number };

/** The space between the highlight and the card, and the least the card keeps from the window's edges. */
export const GAP = 12;
export const MARGIN = 12;

const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), Math.max(min, max));

/** The card's top-left corner, in window pixels. */
export function placeCard(target: Box | null, card: Size, view: Size): { x: number; y: number } {
  const centred = { x: (view.width - card.width) / 2, y: (view.height - card.height) / 2 };
  if (!target) return { x: clamp(centred.x, MARGIN, view.width - card.width - MARGIN), y: clamp(centred.y, MARGIN, view.height - card.height - MARGIN) };

  const midX = target.x + target.width / 2 - card.width / 2;
  const midY = target.y + target.height / 2 - card.height / 2;
  const sides = [
    { fits: target.y + target.height + GAP + card.height <= view.height - MARGIN, x: midX, y: target.y + target.height + GAP },
    { fits: target.y - GAP - card.height >= MARGIN, x: midX, y: target.y - GAP - card.height },
    { fits: target.x + target.width + GAP + card.width <= view.width - MARGIN, x: target.x + target.width + GAP, y: midY },
    { fits: target.x - GAP - card.width >= MARGIN, x: target.x - GAP - card.width, y: midY },
  ];
  // Nowhere has room (a tall card on a phone): against the window's edge on the roomier side,
  // so it covers as little of the element as it can. It used to sit dead centre, right over it.
  const roomBelow = view.height - (target.y + target.height);
  const edge = { x: midX, y: roomBelow >= target.y ? view.height - card.height - MARGIN : MARGIN };
  const at = sides.find((s) => s.fits) ?? edge;
  return { x: clamp(at.x, MARGIN, view.width - card.width - MARGIN), y: clamp(at.y, MARGIN, view.height - card.height - MARGIN) };
}

/** The highlight around an element: a little larger than it, and never past the window. */
export function spotlightBox(target: Box, view: Size, pad = 6): Box {
  const x = Math.max(target.x - pad, 0);
  const y = Math.max(target.y - pad, 0);
  return { x, y, width: Math.min(target.x + target.width + pad, view.width) - x, height: Math.min(target.y + target.height + pad, view.height) - y };
}
