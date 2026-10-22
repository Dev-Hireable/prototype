/**
 * A task named in what someone wrote — a comment or a chat message — so it can open the task it
 * names: a reference typed out ("#4"), or the task's link pasted in (its sheet's Copy link). Not a
 * "#4" inside a word ("C#4"), an HTML entity ("&#4;") or a link.
 */
const TOKEN = /https?:\/\/[^\s<>"]+|(?<![\w&])#(\d{1,6})\b/g;
/** What a sentence can end a link with, which isn't part of the link: "…?task=t-type." */
const TRAILING = /[.,;:!?'")\]}]+$/;

/** A run of written text, or a task named in it: by the number typed, or by the id in a pasted link. */
export type TextPart = { text: string; number?: number; taskId?: string };

/** The task a link opens (`?task=`), or undefined for a link to anything else. */
function taskIdOf(url: string): string | undefined {
  try {
    return new URL(url).searchParams.get("task") ?? undefined;
  } catch {
    return undefined;
  }
}

/**
 * The text split around the tasks named in it, in order: "See #4 first" → "See ", "#4" (4), " first".
 * A pasted task link is a part of its own with the task's id; any other link stays in the text.
 */
export function taskRefParts(text: string): TextPart[] {
  const parts: TextPart[] = [];
  let plain = "";
  let last = 0;
  const flush = () => {
    if (plain) parts.push({ text: plain });
    plain = "";
  };
  for (const m of text.matchAll(TOKEN)) {
    const at = m.index ?? 0;
    plain += text.slice(last, at);
    last = at + m[0].length;
    if (m[1] !== undefined) {
      flush();
      parts.push({ text: m[0], number: Number(m[1]) });
      continue;
    }
    const url = m[0].replace(TRAILING, "");
    const taskId = taskIdOf(url);
    if (!taskId) {
      plain += m[0];
      continue;
    }
    flush();
    parts.push({ text: url, taskId });
    plain += m[0].slice(url.length);
  }
  plain += text.slice(last);
  flush();
  return parts;
}

/** What a part needs of a task to name it. */
type Named = { id: string; number: number; title: string };

/** The task a part names among the contract's, by its number or its link's id; undefined for any other. */
export function taskOf<T extends Named>(p: TextPart, items: readonly T[]): T | undefined {
  if (p.number !== undefined) return items.find((t) => t.number === p.number);
  if (p.taskId !== undefined) return items.find((t) => t.id === p.taskId);
  return undefined;
}

/** The tasks a text names, each once, in the order they first come up, `max` at most: the cards under it. */
export function tasksNamed<T extends Named>(parts: readonly TextPart[], items: readonly T[], max = 3): T[] {
  // A Set keeps them in the order they were first added, each once.
  const found = new Set<T>();
  for (const p of parts) {
    const t = taskOf(p, items);
    if (t) found.add(t);
  }
  return [...found].slice(0, max);
}

/** What someone wrote with each pasted task link read as the task's number and name, never a raw address: a notification's or an inbox's line. */
export function readableRefs(text: string, items: readonly Named[]): string {
  return taskRefParts(text)
    .map((p) => {
      const t = p.taskId === undefined ? undefined : taskOf(p, items);
      return t ? `#${t.number} ${t.title}` : p.text;
    })
    .join("");
}

/** A task's link: the contract page it's on, opening its sheet. */
export const taskLinkAt = (page: { origin: string; pathname: string }, id: string) => `${page.origin}${page.pathname}?task=${encodeURIComponent(id)}`;

const HTML_ESCAPES: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" };
const escapeHtml = (s: string) => s.replace(/[&<>"]/g, (c) => HTML_ESCAPES[c] ?? c);

/** The link as formatted text, named after the task: what Slack, Docs or an email paste from Copy link. */
export const taskLinkHtml = (url: string, name: string) => `<a href="${escapeHtml(url)}">${escapeHtml(name)}</a>`;
