const NAVIGATION_KEYS = [
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'Home',
  'End',
] as const;

type NavigationKey = (typeof NAVIGATION_KEYS)[number];

function isOptionNavigationKey(key: string): key is NavigationKey {
  return (NAVIGATION_KEYS as readonly string[]).includes(key);
}

export function isOptionSelectionKey(key: string): boolean {
  return key === 'Enter' || key === ' ';
}

/**
 * Roving-focus target for a radiogroup: arrows wrap around the ends, Home and
 * End jump to them. Returns `null` when there is nothing to move to.
 */
export function getNextOptionIndex(
  key: string,
  currentIndex: number,
  optionCount: number,
): number | null {
  if (optionCount <= 0 || !isOptionNavigationKey(key)) {
    return null;
  }

  if (key === 'Home') return 0;
  if (key === 'End') return optionCount - 1;

  const direction = key === 'ArrowUp' || key === 'ArrowLeft' ? -1 : 1;
  return (
    (((currentIndex + direction) % optionCount) + optionCount) % optionCount
  );
}
