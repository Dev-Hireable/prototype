/**
 * "Juan Dela Cruz" → "Juan D.": the first name and the surname's initial. A person's full name stays
 * hidden from the other side until they're matched or hired; before that, this is the name shown.
 */
export function shortName(full: string): string {
  const [first = "", ...rest] = full.trim().split(/\s+/);
  return rest.length ? `${first} ${rest[0][0].toUpperCase()}.` : first;
}

/**
 * Whether a typed signature is the account's full name. Letters must match; case and extra spaces
 * don't count, so "juan  dela cruz" signs for "Juan Dela Cruz" but "Juan D." doesn't.
 */
export function signatureMatches(typed: string, fullName: string): boolean {
  const norm = (s: string) => s.trim().replace(/\s+/g, " ").toLowerCase();
  return !!norm(fullName) && norm(typed) === norm(fullName);
}
