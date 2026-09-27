"use client";

import { useMemo } from "react";
import { dayLabel, parseDay } from "@/lib/demo/dates";
import { useDeal, type Deal } from "@/lib/demo/deal";
import { accessOf } from "./access";
import { migrateScope } from "./migrate";
import { conversionVersion, currentVersion, EMPTY_SCOPE, firstVersion, openAmendment, rateAmount, type ContractScope, type ScopeTerms } from "./scope";

/**
 * The live contract's agreed scope, read off the shared deal (./scope): what's saved, or — for a
 * contract signed before the scope was kept — v1 worked out from the signed offer and the contract
 * tasks on file. A trial that became a full-time or part-time role has that role's terms as its next
 * version. Nothing here writes: the next saved change keeps what was worked out.
 */

/** The terms the contract was signed on — the trial's, or a direct hire's. */
export function signedTerms(deal: Deal): ScopeTerms | null {
  const c = deal.contract;
  if (!c) return null;
  const type = deal.offer?.type ?? "trial";
  return {
    type,
    rate: c.rate,
    start: c.started,
    ...(type === "trial" ? { end: c.ends, escrow: c.deposit ?? rateAmount(c.rate) } : {}),
    ...(c.hours ? { hours: c.hours } : {}),
    ...(c.benefits?.length ? { benefits: c.benefits } : {}),
  };
}

/** The role's terms, from the post-trial offer the talent accepted (TB-072 / IN-084). */
function roleTerms(deal: Deal): ScopeTerms | null {
  const x = deal.conversion;
  if (x?.status !== "accepted") return null;
  return { type: x.type, rate: x.salary, start: x.start, ...(x.hours ? { hours: x.hours } : {}), ...(x.benefits?.length ? { benefits: x.benefits } : {}) };
}

const timeOf = (day: string | undefined) => parseDay(day)?.getTime() ?? 0;

export function scopeOfDeal(deal: Deal | null): ContractScope | null {
  const c = deal?.contract;
  if (!deal || !c) return null;
  const terms = signedTerms(deal);
  const saved = migrateScope(c.scope);
  const scope = saved ?? (terms ? { ...EMPTY_SCOPE, versions: [firstVersion({ terms, items: c.tasks, at: dayLabel(c.started), ts: timeOf(c.started) }, deal.offer?.revision ?? 1)] } : null);
  const role = roleTerms(deal);
  if (!scope || !role || scope.versions.some((v) => v.source.kind === "conversion")) return scope;
  const at = deal.conversion?.accepted ?? dayLabel(role.start);
  return { ...scope, versions: [...scope.versions, conversionVersion(scope, { terms: role, items: c.tasks, at, ts: timeOf(at) })] };
}

/**
 * The agreement as a page reads it: the scope, the version in force, the amendment that's open, and
 * whether the contract takes amendments now (its work is open).
 */
export function useAgreement() {
  const deal = useDeal();
  return useMemo(() => {
    const scope = scopeOfDeal(deal);
    const access = accessOf(deal);
    return { deal, scope, access, items: deal?.contract?.tasks ?? [], current: scope ? currentVersion(scope) : undefined, open: scope ? openAmendment(scope) : undefined };
  }, [deal]);
}

