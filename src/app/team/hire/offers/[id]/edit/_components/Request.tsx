import { Button, Card } from "@/components/independent/ui";
import { SuggestionRows } from "@/components/portal/SuggestionRows";
import type { OfferRequest } from "@/lib/contract/negotiation";
import type { SuggestionDecision } from "@/lib/demo/suggestions";

/**
 * TB-149 — the changes the talent asked for before signing (IN-092): their note, the rate they'd sign for, and
 * each task suggestion to accept (it goes into the task list below) or ignore. The next revision
 * answers all of it, so every suggestion needs an answer before it can go out.
 */
export function RequestCard({ request, first, decisions, onDecide, rate, onUseRate }: { request: OfferRequest; first: string; decisions: Readonly<Record<string, SuggestionDecision>>; onDecide: (id: string, d: SuggestionDecision) => void; rate: string; onUseRate: () => void }) {
  const left = request.suggestions.filter((s) => !decisions[s.id]).length;
  return (
    <Card className="flex flex-col gap-4 p-6">
      <div className="flex flex-col gap-1">
        <h3 className="text-[16px] leading-[1.5] font-semibold tracking-[0.2px] text-ink">
          {first} asked for changes to revision {request.revision}
        </h3>
        <p className="text-[12.5px] leading-[1.4] text-ink-2">{request.at} · what you accept goes into the tasks below, and your next revision answers every change.</p>
      </div>
      <p className="text-[14px] leading-[1.45] whitespace-pre-line text-ink [overflow-wrap:anywhere]">“{request.note}”</p>
      {request.rate && (
        <div className="flex flex-wrap items-center gap-3 rounded-md bg-surface-2 px-3 py-2 text-[13px] text-ink">
          <span>
            {first} would sign at <span className="font-semibold">{request.rate}</span> · the offer says {rate}.
          </span>
          <Button size="sm" onClick={onUseRate}>
            Use {request.rate}
          </Button>
        </div>
      )}
      {request.suggestions.length > 0 && <SuggestionRows suggestions={request.suggestions} decisions={decisions} onDecide={onDecide} team />}
      {left > 0 && (
        <p role="status" className="text-[12.5px] text-ink-2">
          {left === 1 ? "1 change still needs" : `${left} changes still need`} an answer before the next revision can go out.
        </p>
      )}
    </Card>
  );
}
