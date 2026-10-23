/**
 * Scrolls a sideways row (a phone's chips or page links) just far enough that `el` is inside it with
 * 16px to spare. By hand: scrollIntoView would scroll the page as well.
 */
export function revealInRow(row: HTMLElement, el: HTMLElement, behavior: ScrollBehavior = "smooth") {
  const r = row.getBoundingClientRect();
  const c = el.getBoundingClientRect();
  const left = c.left < r.left + 16 ? c.left - r.left - 16 : c.right > r.right - 16 ? c.right - r.right + 16 : 0;
  if (left) row.scrollBy({ left, behavior });
}
