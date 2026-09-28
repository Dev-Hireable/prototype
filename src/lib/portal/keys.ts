/**
 * React keys for a list whose items have no id of their own — payments, evaluations, planned tasks.
 * Each key comes from the item's content, so it stays with the item when others are added or
 * removed (a position doesn't). Exact repeats, which really happen (two payments on one day with the
 * same description), get #2, #3… in the order they appear.
 */
export function keyed<T>(items: readonly T[], keyOf: (item: T) => string): { item: T; key: string }[] {
  const seen = new Map<string, number>();
  return items.map((item) => {
    const base = keyOf(item);
    const n = (seen.get(base) ?? 0) + 1;
    seen.set(base, n);
    return { item, key: n === 1 ? base : `${base}#${n}` };
  });
}
