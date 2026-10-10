"use client";

import { persisted, useStored } from "@/lib/demo/live";
import { today } from "@/lib/portal/dates";
import type { PayoutMethod } from "./data";

/**
 * The independent's ID check (KYC). Payouts need it, and it's asked for with a payout method when
 * the first proposal is written, not at sign-up. The demo keeps the day it was done, "" until then;
 * the real check (a document and a selfie with a provider) has no stand-in beyond the button.
 */
const idVerifiedStore = persisted("ind.idVerified", "");

/** Marks the ID verified today. */
const verifyId = () => idVerifiedStore.set(today());

export function useIdVerification() {
  const on = useStored(idVerifiedStore);
  return { verified: on !== "", on, verifyId };
}

/** Why a first proposal can't be sent yet: no payout method, no verified ID, or both. Undefined once both are in. */
export function proposalBlocker(payouts: readonly PayoutMethod[], idVerified: boolean): string | undefined {
  const payout = payouts.length > 0;
  if (payout && idVerified) return undefined;
  if (!payout && !idVerified) return "Add a payout method and verify your ID first.";
  return payout ? "Verify your ID first." : "Add a payout method first.";
}
