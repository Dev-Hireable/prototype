import { Badge } from "@/components/portal/Badge";
import { describeSuggestion, type SuggestionDecision, type TaskSuggestion } from "@/lib/demo/suggestions";

/**
 * The talent's suggested task changes, one per row with their reason — on a revised proposal
 * (TB-106) and on an offer they asked to change (IN-092). The Team Builder accepts or ignores each
 * (and can change their mind until the next version goes out); everyone else reads where each stands.
 */
export function SuggestionRows({ suggestions, decisions, onDecide, team }: { suggestions: TaskSuggestion[]; decisions?: Readonly<Record<string, SuggestionDecision>>; onDecide?: (id: string, d: SuggestionDecision) => void; team: boolean }) {
  return (
    <ul className="flex flex-col">
      {suggestions.map((s) => {
        const d = decisions?.[s.id];
        return (
          <li key={s.id} className="flex items-start gap-3 border-t border-[#eeeeee] py-3 first:border-t-0 first:pt-0 last:pb-0">
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <p className="text-[14px] leading-[1.35] text-ink">{describeSuggestion(s)}</p>
              <p className="text-[13px] leading-[1.4] whitespace-pre-line text-ink-2 [overflow-wrap:anywhere]">“{s.note}”</p>
            </div>
            {onDecide && !d ? (
              <div className="flex shrink-0 gap-2">
                <button type="button" onClick={() => onDecide(s.id, "ignored")} className="h-8 rounded-lg border border-border bg-white px-3 text-[13px] font-medium text-ink hover:bg-surface-alt">
                  Ignore
                </button>
                <button type="button" onClick={() => onDecide(s.id, "accepted")} className="h-8 rounded-lg bg-primary px-3 text-[13px] font-semibold text-white hover:brightness-110">
                  Accept
                </button>
              </div>
            ) : (
              <span className="flex shrink-0 items-center gap-2">
                <Badge tone={d === "accepted" ? "ok" : "neutral"}>{d === "accepted" ? "Accepted" : d === "ignored" ? (team ? "Ignored" : "Not taken") : "Awaiting decision"}</Badge>
                {/* A decision can be taken back until the next version goes out. */}
                {onDecide && d && (
                  <button type="button" onClick={() => onDecide(s.id, d === "accepted" ? "ignored" : "accepted")} className="text-[12.5px] font-medium text-accent-ink hover:underline">
                    {d === "accepted" ? "Ignore" : "Accept"}
                  </button>
                )}
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
