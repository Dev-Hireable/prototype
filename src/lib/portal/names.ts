/**
 * "Juan Dela Cruz" → "Juan D.": the first name and the surname's initial. A person's full name stays
 * hidden from the other side until they're matched or hired; before that, this is the name shown.
 */
export function shortName(full: string): string {
  const [first = "", ...rest] = full.trim().split(/\s+/);
  return rest.length ? `${first} ${rest[0][0].toUpperCase()}.` : first;
}
