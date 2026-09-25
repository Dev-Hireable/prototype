import { expect, test } from "@playwright/test";
import { applySuggestions, checkSuggestion, describeSuggestion, type TaskSuggestion } from "../../src/lib/demo/suggestions";
import type { PlannedTask } from "../../src/lib/demo/tasks";

// IN-073 / TB-106 — the talent suggests changes to a trial's tasks in a revision; the Team Builder
// accepts or ignores each, and what's accepted is what the offer's tasks start from.

const TASKS: PlannedTask[] = [
  { title: "Take over inbox triage", week: 1, priority: "high" },
  { title: "Run both calendars", week: 2, priority: "high" },
  { title: "Clean up the contact sheet", week: 2 },
];
const move: TaskSuggestion = { id: "s1", kind: "change", task: 0, was: "Take over inbox triage", week: 2, note: "I need access first" };
const remove: TaskSuggestion = { id: "s2", kind: "remove", task: 2, was: "Clean up the contact sheet", note: "Your last assistant did it" };
const add: TaskSuggestion = { id: "s3", kind: "add", title: "Set up a shared inbox label system", week: 1, note: "Makes triage faster" };

test.describe("task suggestions", () => {
  test("each needs a reason, and a change has to change something", () => {
    expect(checkSuggestion({ ...move, note: " " }, TASKS)).toBe("Say why — it's what the company decides on.");
    expect(checkSuggestion({ ...move, week: 1 }, TASKS)).toBe("Change its name or its week — or suggest removing it.");
    expect(checkSuggestion({ ...add, title: "" }, TASKS)).toBe("Name the task you'd add.");
    expect(checkSuggestion({ ...remove, task: 9 }, TASKS)).toBe("That task isn't on the list any more.");
    for (const s of [move, remove, add]) expect(checkSuggestion(s, TASKS)).toBeNull();
  });

  test("read as one line", () => {
    expect(describeSuggestion(move)).toBe("“Take over inbox triage”: move it to Week 2");
    expect(describeSuggestion({ ...move, title: "Inbox triage" })).toBe("“Take over inbox triage”: rename it “Inbox triage” and move it to Week 2");
    expect(describeSuggestion(remove)).toBe("Remove “Clean up the contact sheet”");
    expect(describeSuggestion(add)).toBe("Add “Set up a shared inbox label system” in Week 1");
  });

  test("only what the Team Builder accepted changes the offer's tasks", () => {
    expect(applySuggestions(TASKS, [move, remove, add], undefined)).toEqual(TASKS);
    const out = applySuggestions(TASKS, [move, remove, add], { s1: "accepted", s2: "ignored", s3: "accepted" });
    expect(out).toEqual([
      { title: "Take over inbox triage", week: 2, priority: "high" },
      { title: "Run both calendars", week: 2, priority: "high" },
      { title: "Clean up the contact sheet", week: 2 },
      { title: "Set up a shared inbox label system", week: 1 },
    ]);
    expect(applySuggestions(TASKS, [remove], { s2: "accepted" }).map((t) => t.title)).toEqual(["Take over inbox triage", "Run both calendars"]);
  });

  test("a suggestion finds its task by name if the list moved, and is skipped if the task has gone", () => {
    const moved = [TASKS[1], TASKS[0]];
    expect(applySuggestions(moved, [move], { s1: "accepted" })[1]).toMatchObject({ title: "Take over inbox triage", week: 2 });
    expect(applySuggestions([TASKS[1]], [move], { s1: "accepted" })).toEqual([TASKS[1]]);
  });
});
