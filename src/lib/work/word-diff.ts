/**
 * A word-level diff of two texts, the way a document's tracked changes read: what stayed, what was
 * taken out and what was put in, in order. Used to show a contract task's requirements before and
 * after a proposed change. Whitespace travels with the word after it; a word both texts share keeps
 * the new text's spacing.
 */

export type DiffOp = "same" | "del" | "add";
export type DiffPart = { op: DiffOp; text: string };

/** Past this many words a side, the texts are shown as one removal and one addition. */
const MAX_TOKENS = 600;

/** Words with the whitespace before them, so "a  b" splits into "a" and "  b". */
const tokens = (s: string) => s.match(/\s*\S+|\s+$/g) ?? [];

/** Adjacent parts with the same op run together. */
function merged(parts: DiffPart[]): DiffPart[] {
  const out: DiffPart[] = [];
  for (const p of parts) {
    const last = out.at(-1);
    if (last && last.op === p.op) last.text += p.text;
    else if (p.text) out.push({ ...p });
  }
  return out;
}

/** The longest common subsequence table of `a` and `b`, filled from the end. */
function lcsTable(a: readonly string[], b: readonly string[]): number[][] {
  const t = Array.from({ length: a.length + 1 }, () => Array.from({ length: b.length + 1 }, () => 0));
  for (let i = a.length - 1; i >= 0; i--) for (let j = b.length - 1; j >= 0; j--) t[i][j] = a[i].trim() === b[j].trim() ? t[i + 1][j + 1] + 1 : Math.max(t[i + 1][j], t[i][j + 1]);
  return t;
}

/** `before` → `after` as parts: same, deleted, added. Two equal texts are one "same" part. */
export function wordDiff(before: string, after: string): DiffPart[] {
  if (before === after) return before ? [{ op: "same", text: before }] : [];
  const a = tokens(before);
  const b = tokens(after);
  if (a.length > MAX_TOKENS || b.length > MAX_TOKENS) return merged([{ op: "del", text: before }, { op: "add", text: after }]);
  const t = lcsTable(a, b);
  const parts: DiffPart[] = [];
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i].trim() === b[j].trim()) {
      parts.push({ op: "same", text: b[j] });
      i++;
      j++;
    } else if (t[i + 1][j] >= t[i][j + 1]) parts.push({ op: "del", text: a[i++] });
    else parts.push({ op: "add", text: b[j++] });
  }
  while (i < a.length) parts.push({ op: "del", text: a[i++] });
  while (j < b.length) parts.push({ op: "add", text: b[j++] });
  return merged(parts);
}
