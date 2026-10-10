/**
 * The one set of notification categories, named by what the person does with them. Both portals'
 * feeds filter by these and both notification settings list events under them, so a filter and a
 * preference never disagree about what "Tasks" covers.
 */
export const NOTE_CATEGORIES = [
  { value: "applications", label: "Applications" },
  { value: "interviews", label: "Interviews" },
  { value: "tasks", label: "Tasks" },
  { value: "messages", label: "Messages" },
  { value: "payments", label: "Payments" },
] as const;

export type NoteCategory = (typeof NOTE_CATEGORIES)[number]["value"];

const CATEGORIES = new Set<string>(NOTE_CATEGORIES.map((c) => c.value));

/**
 * A stored notification's category. Feeds saved before the categories were shared carry the old
 * kinds (hiring, independents, contracts, offers, other); they're filed by what they say.
 */
export function categoryOf(n: { kind: string; title: string }): NoteCategory {
  if (CATEGORIES.has(n.kind)) return n.kind as NoteCategory;
  if (n.title.startsWith("New message")) return "messages";
  if (/interview/i.test(n.title)) return "interviews";
  if (n.kind === "independents" || (n.kind === "contracts" && !/proposal/i.test(n.title))) return "tasks";
  return "applications";
}
