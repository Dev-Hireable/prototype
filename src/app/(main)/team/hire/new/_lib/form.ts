import { useState } from "react";
import type { JobType, OngoingType } from "@/lib/contract/job-types";
import { blankDraft, toDrafts, type DraftTask } from "@/lib/demo/tasks";
import type { Role } from "@/lib/team/data";
import { LEVELS, type RoleTemplate } from "@/lib/team/role-templates";
import { budgetRange, chipOf, formShape, onlyTitle, resumeStep, sectionsOk, templateChanges, templateShape, type ReviewSection, type Snapshot } from "./wizard";

/** The kind of role being written: a trial, or Build Team's full-time or part-time. */
export function useRoleType(editing: Role | undefined, param: string | null) {
  // An edited draft carries its own type; the query param only matters for a brand new post.
  const startType: JobType = editing?.type ?? (param === "part-time" || param === "full-time" ? param : "trial");
  /** Build Team's Employment type switch: full-time or part-time, until the post is saved. */
  const [ongoing, setOngoing] = useState<OngoingType | null>(null);
  const type: JobType = startType === "trial" ? "trial" : (ongoing ?? startType);
  return [type, setOngoing] as const;
}

/** The details step's fields: the role, what it involves, the skills and level it asks for, and how many to hire. */
function useDetailFields(editing: Role | undefined) {
  const [title, setTitle] = useState(editing?.title ?? "");
  const [desc, setDesc] = useState(editing?.description ?? "");
  const [level, setLevel] = useState(editing && LEVELS.includes(editing.experience) ? editing.experience : LEVELS[0]);
  const [skills, setSkills] = useState<string[]>(editing?.skills ?? []);
  const [hires, setHires] = useState(editing?.hires ?? 1);
  return { title, setTitle, desc, setDesc, level, setLevel, skills, setSkills, hires, setHires };
}

/** The trial tasks step's fields: the tasks, and the notes and attachment that go with them. */
function useTaskFields(editing: Role | undefined) {
  /** TB-024 — the trial's tasks, as the job post lists them; the notes beside them are optional. */
  const [taskRows, setTaskRows] = useState<DraftTask[]>(() => (editing?.tasks?.length ? toDrafts(editing.tasks) : [blankDraft()]));
  const [expectation, setExpectation] = useState(editing?.expectation ?? "");
  const [attachment, setAttachment] = useState(editing?.attachment ?? "");
  return { taskRows, setTaskRows, expectation, setExpectation, attachment, setAttachment };
}

/** What the role pays and for how long: the budget range, the length or start chip, the hours and the benefits. */
function usePayFields(editing: Role | undefined, chips: readonly string[]) {
  const [min, setMin] = useState(() => (editing ? budgetRange(editing.budget)[0] : ""));
  const [max, setMax] = useState(() => (editing ? budgetRange(editing.budget)[1] : ""));
  const [chip, setChip] = useState(() => chipOf(editing?.duration, chips));
  /** A part-time role's hours a week. */
  const [hours, setHours] = useState<number>(editing?.hours || 20);
  /** Benefit label → monthly amount; absent means the checkbox is off. */
  const [benefits, setBenefits] = useState<Record<string, string>>(() => Object.fromEntries((editing?.benefits ?? []).map((b) => [b.label, b.amount])));
  return { min, setMin, max, setMax, chip, setChip, hours, setHours, benefits, setBenefits };
}

/**
 * The wizard's form: every field it edits and the step it's on. TB-035 — a draft opens with
 * everything it already had: a duplicate lands straight on Review (every field is already
 * populated), one built from scratch at the first step still missing something. The wizard is keyed
 * on the draft, so these start from it when it turns up (drafts hydrate from storage after mount).
 */
export function useRoleForm(editing: Role | undefined, { sequence, chips }: { sequence: readonly string[]; chips: readonly string[] }) {
  const [step, setStep] = useState(() => (!editing ? 0 : editing.duplicatedFrom ? sequence.indexOf("review") : resumeStep(editing, sequence)));
  const details = useDetailFields(editing);
  const tasks = useTaskFields(editing);
  const pay = usePayFields(editing, chips);

  const snapshot = (): Snapshot => ({
    title: details.title,
    desc: details.desc,
    level: details.level,
    skills: details.skills,
    hires: details.hires,
    taskRows: tasks.taskRows,
    expectation: tasks.expectation,
    attachment: tasks.attachment,
    min: pay.min,
    max: pay.max,
    chip: pay.chip,
    hours: pay.hours,
    benefits: pay.benefits,
  });
  /** Puts these values in every field: what Review's Cancel restores, or what a template fills in. */
  const load = (v: Snapshot) => {
    details.setTitle(v.title);
    details.setDesc(v.desc);
    details.setLevel(v.level);
    details.setSkills(v.skills);
    details.setHires(v.hires);
    tasks.setTaskRows(v.taskRows);
    tasks.setExpectation(v.expectation);
    tasks.setAttachment(v.attachment);
    pay.setMin(v.min);
    pay.setMax(v.max);
    pay.setChip(v.chip);
    pay.setHours(v.hours);
    pay.setBenefits(v.benefits);
  };
  return { step, setStep, ...details, ...tasks, ...pay, snapshot, load };
}

export type RoleForm = ReturnType<typeof useRoleForm>;

/**
 * Role templates: the one filling the form, one waiting on "replace what you typed?" (or "blank"
 * for Start from scratch), and whether the full library is open.
 */
export function useTemplates(f: RoleForm, type: JobType, chips: readonly string[]) {
  const [template, setTemplate] = useState<RoleTemplate | null>(null);
  const [pending, setPending] = useState<RoleTemplate | "blank" | null>(null);
  const [browsing, setBrowsing] = useState(false);
  /** Everything a template would replace, other than the title, is still empty. */
  const titleOnly = onlyTitle(f);
  /** Nothing changed since the template went in, so switching or clearing can't lose anyone's typing. */
  const untouched = !!template && templateShape(template, type, chips, f) === formShape(f);
  const apply = (tpl: RoleTemplate | "blank") => {
    f.load({ ...f.snapshot(), ...templateChanges(tpl, type, chips) });
    setTemplate(tpl === "blank" ? null : tpl);
    setPending(null);
    setBrowsing(false);
  };
  return {
    template,
    pending,
    setPending,
    browsing,
    setBrowsing,
    apply,
    /** Straight in on a blank or untouched form; otherwise confirm first, so a pick never eats typing. */
    pick: (tpl: RoleTemplate | "blank") => (untouched || (titleOnly && !f.title.trim()) ? apply(tpl) : setPending(tpl)),
    /**
     * A suggestion under the Role field comes from what was typed there, so replacing that title is
     * the point — it only asks when there is more than the title to lose.
     */
    pickSuggestion: (tpl: RoleTemplate) => (titleOnly || untouched ? apply(tpl) : setPending(tpl)),
  };
}

export type Templates = ReturnType<typeof useTemplates>;

/**
 * Review edits in place: the one section being edited, and the values from before it opened so
 * Cancel can put them back. The fields write straight to the wizard state, so Save just closes.
 */
export function useReviewEdits(f: RoleForm) {
  const [open, setOpen] = useState<{ section: ReviewSection; before: Snapshot } | null>(null);
  /** Same rules as the wizard steps, so a quick edit can't leave a required field empty. */
  const ok = sectionsOk(f);
  const cancel = () => {
    if (open) f.load(open.before);
    setOpen(null);
  };
  return {
    editing: open !== null,
    cancel,
    /** Props every review section shares: which one is open, and Save / Cancel for it. */
    item: (section: ReviewSection) => ({
      editing: open?.section === section,
      locked: open !== null && open.section !== section,
      canSave: ok[section],
      onEdit: () => setOpen({ section, before: f.snapshot() }),
      onSave: () => setOpen(null),
      onCancel: cancel,
    }),
  };
}

export type ReviewEdits = ReturnType<typeof useReviewEdits>;
