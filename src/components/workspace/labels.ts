import type { IconName } from "@/components/icons";
import type { ColumnColors } from "@/components/portal/board";
import type { AssigneeKey, Side, WorkStatus, WorkType } from "@/lib/work/model";
import type { Group } from "@/lib/work/query";

/*
 * The names and colours work is shown with — the icon per work type, the column palette per status,
 * who an assignee is — apart from the components that draw them (./meta), so editing either keeps
 * the other's state under Fast Refresh.
 */

export const TYPE_ICON: Record<WorkType, IconName> = {
  task: "typeTask",
  milestone: "typeMilestone",
  design: "typeDesign",
  development: "typeDevelopment",
  marketing: "typeMarketing",
  content: "typeContent",
  research: "typeResearch",
  review: "typeReview",
  meeting: "typeMeeting",
  admin: "typeAdmin",
  operations: "typeOperations",
  other: "typeOther",
};

/** Column headers in the pipeline boards' palette: grey, blue, amber, green. */
const STATUS_COLUMN: Record<WorkStatus, ColumnColors> = {
  todo: { bg: "#e5e5e5", text: "#4a4a4a", count: "#d8d8d8" },
  doing: { bg: "#ebf8fe", text: "#004675", count: "#c9eeff" },
  review: { bg: "#fffbeb", text: "#7a5e0a", count: "#fff0b6" },
  done: { bg: "#f0fdf4", text: "#1b6b3a", count: "#c6ffd2" },
};

/** Every other grouping's columns share one neutral header. */
const PLAIN_COLUMN: ColumnColors = { bg: "#f2f2f2", text: "#212121", count: "#e3e3e3" };

/** A group's colours, wherever it's drawn: a Board column, a List heading, a Timeline band. */
export const groupColors = (g: Group): ColumnColors => (g.value.field === "status" ? STATUS_COLUMN[g.value.value] : PLAIN_COLUMN);

/** Who is on each side of the contract, for "Added by" and the activity feed. */
export type TaskPeople = Record<Side, { name: string; avatar: string }>;

export const firstName = (name: string) => name.split(" ")[0];

/** A person's name for a group heading or a menu: "Juan", "Alex", "Unassigned". */
export const assigneeLabel = (k: AssigneeKey, people: TaskPeople) => (k === "none" ? "Unassigned" : firstName(people[k].name));
