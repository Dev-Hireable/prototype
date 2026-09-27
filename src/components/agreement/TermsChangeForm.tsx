"use client";

import { useState } from "react";
import { Button, Field, InfoBanner, Input } from "@/components/independent/ui";
import { usd } from "@/lib/demo/disputes";
import { formatMoney } from "@/lib/portal/money";
import { HOURS_MAX, HOURS_MIN, rateAmount, type ScopeTerms, type TermsPatch } from "@/lib/work/scope";

/**
 * The pay as an amendment proposes it — and on a part-time role its hours. What a new rate does is
 * said under it: a trial's escrow is re-priced when it's accepted; a role's pay changes from the
 * first of the month after.
 */
export function TermsChangeForm({ terms, effect, onSave, onCancel }: { terms: ScopeTerms; effect: (monthly: number) => string; onSave: (to: TermsPatch) => string | null; onCancel: () => void }) {
  const [rate, setRate] = useState(() => formatMoney(String(rateAmount(terms.rate))));
  const [hours, setHours] = useState(String(terms.hours ?? ""));
  const [error, setError] = useState<string | null>(null);
  const partTime = terms.type === "part-time";
  const amount = rateAmount(rate);
  const save = () => {
    const to: TermsPatch = {};
    if (amount !== rateAmount(terms.rate)) to.rate = `${usd(amount)}/mo`;
    if (partTime && Number(hours) !== terms.hours) to.hours = Number(hours);
    setError(onSave(to));
  };
  return (
    <form
      aria-label="Change the pay"
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
      className="flex flex-col gap-3 rounded-lg border border-border bg-surface-alt p-4"
    >
      <div className="flex flex-wrap gap-4">
        <Field label={terms.type === "full-time" ? "Salary (USD / month)" : "Rate (USD / month)"} hint={`Agreed now: ${terms.rate}`} className="w-56">
          <Input autoFocus value={rate} onChange={(e) => {
              setRate(formatMoney(e.target.value));
              setError(null);
            }} inputMode="decimal" aria-label="Pay per month" />
        </Field>
        {partTime && (
          <Field label="Hours a week" hint={`Agreed now: ${terms.hours ?? "—"} · ${HOURS_MIN}–${HOURS_MAX}`} className="w-40">
            <Input value={hours} onChange={(e) => {
                setHours(e.target.value.replace(/[^0-9]/g, ""));
                setError(null);
              }} inputMode="numeric" aria-label="Hours a week" />
          </Field>
        )}
      </div>
      {amount > 0 && amount !== rateAmount(terms.rate) && <InfoBanner>{effect(amount)}</InfoBanner>}
      {error && (
        <p role="alert" className="text-[13px] text-danger">
          {error}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <Button size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button size="sm" variant="primary" type="submit">
          Save change
        </Button>
      </div>
    </form>
  );
}
