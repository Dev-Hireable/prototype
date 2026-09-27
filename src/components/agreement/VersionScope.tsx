import { Badge } from "@/components/portal/Badge";
import { JOB_TYPE_LABEL } from "@/lib/demo/job-types";
import { refOf, type WorkItem } from "@/lib/work/model";
import { valueText, type ContractVersion, type ScopeTask, type ScopeTerms } from "@/lib/work/scope";

/** A version's terms, one to a line: the contract, its pay, its dates, and a part-time role's hours or a full-time one's benefits. */
function TermsList({ terms }: { terms: ScopeTerms }) {
  const rows: [string, string][] = [
    ["Contract", JOB_TYPE_LABEL[terms.type]],
    [terms.type === "full-time" ? "Salary" : "Rate", terms.rateFrom ? `${terms.rate} from ${valueText("due", terms.rateFrom)}` : terms.rate],
    ...(terms.escrow !== undefined ? ([["Escrow", `$${terms.escrow.toLocaleString("en-US")}`]] as [string, string][]) : []),
    [terms.type === "trial" ? "Trial" : "Starts", terms.end ? `${valueText("due", terms.start)} – ${valueText("due", terms.end)}` : valueText("due", terms.start)],
    ...(terms.hours ? ([["Hours", `${terms.hours} a week`]] as [string, string][]) : []),
    ...(terms.benefits?.length ? ([["Benefits", terms.benefits.join(", ")]] as [string, string][]) : []),
  ];
  return (
    <dl className="grid grid-cols-[max-content_minmax(0,1fr)] gap-x-6 gap-y-2 text-[13.5px] leading-[1.4]">
      {rows.map(([k, v]) => (
        <div key={k} className="contents">
          <dt className="text-ink-2">{k}</dt>
          <dd className="text-ink [overflow-wrap:anywhere]">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

/** One contract task as a version holds it: its number on the list today, its name, deadline, estimate, and what done means. */
function TaskLine({ t, item }: { t: ScopeTask; item?: WorkItem }) {
  const facts = [t.due ? `Due ${valueText("due", t.due)}` : "No due date", t.effort !== undefined && `effort ${t.effort}`].filter(Boolean).join(" · ");
  return (
    <li className="flex flex-col gap-1 border-t border-[#eeeeee] py-2.5 first:border-t-0">
      <div className="flex flex-wrap items-center gap-2">
        <span className="min-w-0 flex-1 text-[14px] leading-[1.35] font-medium text-ink">
          {item ? `${refOf(item)} ` : ""}
          {t.title}
        </span>
        {t.milestone && <Badge tone="accent">Milestone</Badge>}
        <span className="text-[12.5px] text-ink-2">{facts}</span>
      </div>
      {t.description && <p className="text-[13px] leading-[1.45] whitespace-pre-line text-ink-2 [overflow-wrap:anywhere]">{t.description}</p>}
    </li>
  );
}

/** What a version holds, read-only: its terms, then its contract tasks — deliverables and milestones — as agreed then. */
export function VersionScope({ version, items }: { version: Pick<ContractVersion, "terms" | "tasks">; items: ReadonlyMap<string, WorkItem> }) {
  return (
    <div className="flex flex-col gap-4">
      <TermsList terms={version.terms} />
      <div className="flex flex-col gap-1">
        <p className="text-[13px] font-semibold text-ink">
          {version.tasks.length} contract {version.tasks.length === 1 ? "task" : "tasks"}
          {version.tasks.some((t) => t.milestone) ? ` · ${version.tasks.filter((t) => t.milestone).length} milestone${version.tasks.filter((t) => t.milestone).length === 1 ? "" : "s"}` : ""}
        </p>
        {version.tasks.length ? (
          <ul className="flex flex-col">
            {version.tasks.map((t) => (
              <TaskLine key={t.id} t={t} item={items.get(t.id)} />
            ))}
          </ul>
        ) : (
          <p className="text-[13px] text-ink-2">None — the work is added as the role goes on.</p>
        )}
      </div>
    </div>
  );
}
