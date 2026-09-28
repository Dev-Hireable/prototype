import { useState } from "react";
import type { SetToast } from "@/lib/portal/toast";
import { useTeamContracts } from "@/lib/team/contracts";
import { CONVERSION_ID, useOffers } from "@/lib/team/offers";
import { evaluationToast } from "./copy";
import { hireFormFor, prefill, SCORES, type EvaluationDraft } from "./forms";
import type { Tracker } from "./tracker";

/**
 * The tracker's dialogs and what its buttons do: hire after the trial (and the offer being written
 * for it), end the contract, file a dispute, send the evaluation, and withdraw the post-trial offer
 * or the notice — each reporting back in a toast.
 */
export function useTrackerActions(t: Tracker, draft: EvaluationDraft, toast: SetToast) {
  const { withdrawOffer } = useOffers();
  const { withdrawNotice, addEvaluation } = useTeamContracts();
  const [converting, setConverting] = useState(false);
  const [ending, setEnding] = useState(false);
  /** TB-072 — the post-trial offer, pre-filled from what they earn on the trial. */
  const [hire, setHire] = useState(() => hireFormFor(t.contract.rate));
  const [disputing, setDisputing] = useState(false);
  const { contract, view, first, isTrial } = t;
  return {
    converting,
    setConverting,
    ending,
    setEnding,
    hire,
    setHire,
    disputing,
    setDisputing,
    openDispute: () => setDisputing(true),
    openEnd: () => setEnding(true),
    openConvert: () => {
      setHire((h) => prefill(h, view.conversion, t.latest?.recommendation));
      setConverting(true);
    },
    sendEvaluation: () => {
      const r = addEvaluation(contract.slug, { stars: Math.round(draft.scores.reduce((a, b) => a + b, 0) / draft.scores.length), scores: SCORES.map((label, i) => ({ label, value: draft.scores[i] })), feedback: draft.feedback.trim(), recommendation: draft.recommendation });
      if (r.ok && !isTrial) draft.clear();
      toast(evaluationToast(r, first), r.ok ? "success" : "danger");
    },
    withdrawOffer: () => {
      withdrawOffer(CONVERSION_ID);
      toast(`Offer withdrawn — ${first} has been told`);
    },
    withdrawNotice: () => {
      const r = withdrawNotice();
      toast(r.ok ? `Notice withdrawn — ${first}'s role carries on` : r.error, r.ok ? "success" : "danger");
    },
  };
}

export type TrackerActions = ReturnType<typeof useTrackerActions>;
