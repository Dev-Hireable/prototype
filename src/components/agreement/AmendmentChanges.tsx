import { ChangeList, ChangeRow, TextChange, ValueChange } from "@/components/portal/ScopeDiff";
import { refOf, type WorkItem } from "@/lib/work/model";
import { fieldLabel, valueText, type FieldDiff, type ResolvedChange, type ScopeTask } from "@/lib/work/scope";

/** "Due 03 Oct · effort 5 · milestone": a task's agreed definition, in one line. */
function taskFacts(t: ScopeTask): string {
  return [t.due && `Due ${valueText("due", t.due)}`, t.effort !== undefined && `effort ${t.effort}`, t.milestone && "milestone"].filter(Boolean).join(" · ");
}

/** One field before and after: its requirements as tracked changes, anything else as previous → proposed. */
function FieldChange({ d }: { d: FieldDiff }) {
  const label = fieldLabel(d.field);
  const title = label[0].toUpperCase() + label.slice(1);
  if (d.field === "description") return <TextChange label={title} was={String(d.was ?? "")} to={String(d.to ?? "")} />;
  return <ValueChange label={title} was={valueText(d.field, d.was)} to={valueText(d.field, d.to)} />;
}

/**
 * An amendment's changes as both sides read them: each task added, removed or changed — with its
 * number on the list, and every changed field before and after — and a change to the pay.
 */
export function AmendmentChanges({ changes, items, label }: { changes: readonly ResolvedChange[]; items: ReadonlyMap<string, WorkItem>; label: string }) {
  const ref = (id: string) => {
    const t = items.get(id);
    return t ? `${refOf(t)} ` : "";
  };
  return (
    <ChangeList label={label}>
      {changes.map((c) => {
        if (c.kind === "terms")
          return (
            <ChangeRow key={c.id} kind="changed" title="Terms">
              {c.fields.map((d) => (
                <FieldChange key={d.field} d={d} />
              ))}
            </ChangeRow>
          );
        if (c.kind === "change")
          return (
            <ChangeRow key={c.id} kind="changed" title={`${ref(c.task.id)}${c.task.title}`}>
              {c.fields.map((d) => (
                <FieldChange key={d.field} d={d} />
              ))}
            </ChangeRow>
          );
        return (
          <ChangeRow key={c.id} kind={c.kind === "add" ? "added" : "removed"} title={`${c.kind === "remove" ? ref(c.task.id) : ""}${c.task.title}`} meta={taskFacts(c.task) || undefined}>
            {c.kind === "add" && c.task.description && <p className="text-[13px] leading-[1.45] whitespace-pre-line text-ink-2 [overflow-wrap:anywhere]">{c.task.description}</p>}
          </ChangeRow>
        );
      })}
    </ChangeList>
  );
}
