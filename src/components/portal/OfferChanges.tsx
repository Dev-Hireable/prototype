import { Card } from "@/components/independent/ui";
import { Badge } from "@/components/portal/Badge";
import { ChangeList, ChangeRow, TextChange, ValueChange } from "@/components/portal/ScopeDiff";
import { currentRevision, offerDiff, previousRevision, revisionOf, type OfferTerm, type TaskChange, type TermChange } from "@/lib/contract/negotiation";
import { dayLabel } from "@/lib/demo/dates";
import type { DealOffer } from "@/lib/demo/deal";
import { describeSuggestion } from "@/lib/demo/suggestions";
import { PRIORITY_LABEL, weekLabel } from "@/lib/demo/tasks";
import { keyed } from "@/lib/portal/keys";
import { rateAmount } from "@/lib/work/scope";

const TERM_LABEL: Record<OfferTerm, string> = { rate: "Rate", start: "Start date", end: "End date", hours: "Hours a week", benefits: "Benefits" };

/** A term's value in words: dates as "25 Sep 2026", nothing as "None". */
const termValue = (c: TermChange, v: string | undefined) => (!v ? "None" : c.field === "start" || c.field === "end" ? dayLabel(v) : v);

/** A task that changed between revisions: each field before and after, its details as tracked changes. */
function TaskFields({ c }: { c: Extract<TaskChange, { kind: "changed" }> }) {
  return (
    <>
      {c.fields.includes("title") && <ValueChange label="Name" was={c.was.title} to={c.task.title} />}
      {c.fields.includes("description") && <TextChange label="Details" was={c.was.description ?? ""} to={c.task.description ?? ""} />}
      {c.fields.includes("week") && <ValueChange label="Due" was={weekLabel(c.was.week)} to={weekLabel(c.task.week)} />}
      {c.fields.includes("priority") && <ValueChange label="Priority" was={c.was.priority ? PRIORITY_LABEL[c.was.priority] : "None"} to={c.task.priority ? PRIORITY_LABEL[c.task.priority] : "None"} />}
    </>
  );
}

/** The talent's request this revision answers: each suggestion taken or not, and the rate they asked for. */
function Answers({ offer, viewer }: { offer: DealOffer; viewer: "team" | "independent" }) {
  const r = offer.request;
  if (!r || r.status !== "answered" || r.answeredIn !== revisionOf(offer)) return null;
  const asked = viewer === "independent" ? "You asked" : "They asked";
  return (
    <div className="flex flex-col gap-2 border-t border-[#eeeeee] pt-4">
      <p className="text-[14px] leading-[1.4] font-semibold text-ink">{asked} for changes to revision {r.revision}</p>
      <p className="text-[13px] leading-[1.45] whitespace-pre-line text-ink-2 [overflow-wrap:anywhere]">“{r.note}”</p>
      <ul className="flex flex-col gap-1.5">
        {r.rate && (
          <li className="flex flex-wrap items-center gap-2 text-[13px] leading-[1.45] text-ink">
            Rate {r.rate} <Badge tone={rateAmount(r.rate) === rateAmount(offer.rate) ? "ok" : "neutral"}>{rateAmount(r.rate) === rateAmount(offer.rate) ? "Accepted" : `Offered ${offer.rate}`}</Badge>
          </li>
        )}
        {keyed(r.suggestions, (s) => s.id).map(({ item: s, key }) => (
          <li key={key} className="flex flex-wrap items-center gap-2 text-[13px] leading-[1.45] text-ink">
            {describeSuggestion(s)} <Badge tone={r.decisions?.[s.id] === "accepted" ? "ok" : "neutral"}>{r.decisions?.[s.id] === "accepted" ? "Accepted" : "Not taken"}</Badge>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * IN-092 — what changed from the revision before: every term and task added, removed or changed,
 * the old value beside the new, and how the talent's request was answered. Nothing to compare on a
 * first revision, so there's nothing to show.
 */
export function OfferChanges({ offer, from, viewer }: { offer: DealOffer; from: string; viewer: "team" | "independent" }) {
  const before = previousRevision(offer);
  if (!before) return null;
  const now = currentRevision(offer);
  const { terms, tasks } = offerDiff(before, now);
  const none = !terms.length && !tasks.length;
  return (
    <Card className="flex flex-col gap-4 p-6">
      <div className="flex flex-col gap-1">
        <h3 className="text-[16px] leading-[1.5] font-semibold tracking-[0.2px] text-ink">What changed in revision {now.revision}</h3>
        <p className="text-[13px] leading-[1.4] text-ink-2">
          Compared with revision {before.revision}, sent {before.sent}. {from} sent this one {now.sent}.
        </p>
      </div>
      {none ? (
        <p className="text-[13px] leading-[1.45] text-ink-2">The terms and the tasks are as they were in revision {before.revision}.</p>
      ) : (
        <ChangeList label={`Changes in revision ${now.revision}`}>
          {terms.map((c) => (
            <ChangeRow key={c.field} kind={c.was && c.to ? "changed" : c.to ? "added" : "removed"} title={TERM_LABEL[c.field]}>
              <ValueChange was={termValue(c, c.was)} to={termValue(c, c.to)} />
            </ChangeRow>
          ))}
          {tasks.map((c) => (
            <ChangeRow key={`${c.kind}-${c.task.id}`} kind={c.kind} title={c.kind === "changed" ? c.was.title : c.task.title} meta={c.kind === "changed" ? undefined : weekLabel(c.task.week)}>
              {c.kind === "changed" && <TaskFields c={c} />}
            </ChangeRow>
          ))}
        </ChangeList>
      )}
      <Answers offer={offer} viewer={viewer} />
    </Card>
  );
}
