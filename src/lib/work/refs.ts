/**
 * A task's reference ("#4") in what someone wrote — a comment or a chat message — so it can open the
 * task it names. Not one inside a word ("C#4") or an HTML entity ("&#4;").
 */
const REF = /(?<![\w&])#(\d{1,6})\b/g;

/** A run of written text, or a reference in it with the number it names. */
export type TextPart = { text: string; number?: number };

/** The text split around the task references in it, in order: "See #4 first" → "See ", "#4" (4), " first". */
export function taskRefParts(text: string): TextPart[] {
  const parts: TextPart[] = [];
  let last = 0;
  for (const m of text.matchAll(REF)) {
    const at = m.index ?? 0;
    if (at > last) parts.push({ text: text.slice(last, at) });
    parts.push({ text: m[0], number: Number(m[1]) });
    last = at + m[0].length;
  }
  if (last < text.length) parts.push({ text: text.slice(last) });
  return parts;
}
