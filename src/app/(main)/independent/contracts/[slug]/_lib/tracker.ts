import { useState } from "react";
import type { ContractView } from "@/lib/contract/view";
import { endOptions } from "@/lib/demo/contract";
import { PAIR } from "@/lib/demo/live";
import { storedWorkStyle, traitTagsFor } from "@/lib/demo/work-style";
import type { Profile } from "@/lib/independent/account";
import type { Contract } from "@/lib/independent/data";

/**
 * The talent's contract page, worked out once a render from the contract and the shared view of it
 * (@/lib/contract/view): the thread with its manager, who works on it, whether it has ended, and how
 * the talent can end it — what every tab and dialog reads.
 */
export function trackerOf(contract: Contract, view: ContractView, me: Pick<Profile, "name" | "photo">, thread: string) {
  const isTrial = contract.type === "trial";
  return {
    contract,
    view,
    thread,
    isTrial,
    ended: contract.status.label === "Ended",
    /** The trial's score is final once the trial has been evaluated, or once it became a role. */
    scoreFinal: !isTrial || !!view.trialEval,
    people: { team: { name: contract.manager, avatar: PAIR.team.avatar }, independent: { name: me.name, avatar: me.photo } },
    actor: { role: "contributor" as const, name: me.name },
    /** The Team Builder's own quiz answers, from their portal — what their badges say about how they work. */
    companyTags: contract.company === PAIR.team.company ? traitTagsFor(storedWorkStyle("team"), "team") : [],
    ...endChoices(view),
  };
}

export type Tracker = ReturnType<typeof trackerOf>;

/**
 * IN-091 — how the talent can end the live contract right now (@/lib/demo/contract): cancel it
 * before its first day, or give notice on a running role. Notice either side gave shows too.
 */
function endChoices({ onDeal, deal }: ContractView) {
  const opts = onDeal ? endOptions(deal, "independent") : [];
  return { cancelOpt: opts.find((o) => o?.how === "cancel") ?? undefined, noticeOpt: opts.find((o) => o?.how === "notice") ?? undefined };
}

/** The page's three dialogs, each opened from a tab or the header. */
export function useTrackerDialogs() {
  /** IN-091 — the confirmation for giving notice, or cancelling before the first day. */
  const [ending, setEnding] = useState(false);
  /** IN-059 — the dispute form: reason, description and amount are required, evidence is not. */
  const [filing, setFiling] = useState(false);
  /** IN-049 — the company behind the contract, read-only. */
  const [companyOpen, setCompanyOpen] = useState(false);
  return { ending, setEnding, filing, setFiling, companyOpen, setCompanyOpen };
}

export type Dialogs = ReturnType<typeof useTrackerDialogs>;
