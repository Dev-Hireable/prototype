"use client";

import { useState } from "react";
import { ICONS } from "@/components/icons";
import { Button, Checkbox, Field, Input, Modal, Select } from "@/components/portal/ui";
import { useIndependentAccount } from "@/lib/independent/account";
import type { PayoutMethod } from "@/lib/independent/data";
import { useWallet } from "@/lib/independent/wallet";

const TYPES = ["Bank transfer (InstaPay / PESONet)", "GCash", "Maya"];

/**
 * The method the form describes, new and pending verification: a bank account paid through
 * InstaPay / PESONet, or a GCash or Maya number.
 */
function payoutFrom({ type, bank, name, number, isDefault }: { type: string; bank: string; name: string; number: string; isDefault: boolean }): PayoutMethod {
  const isBank = type === TYPES[0];
  return {
    id: `pm-${Date.now()}`,
    brand: isBank ? "Bank" : (type as "GCash" | "Maya"),
    last4: number.replace(/\s/g, "").slice(-4),
    holder: name.trim(),
    verified: "Verification pending",
    detail: isBank ? `${bank} · InstaPay / PESONet` : `${type} · ${number}`,
    isDefault,
  };
}

/** Shared by Wallet and Settings. */
export function AddPayoutModal({ open, onClose, onAdded }: { open: boolean; onClose: () => void; onAdded: (m: PayoutMethod) => void }) {
  const { addPayout } = useWallet();
  /** The account has to be in the talent's own name: the full name on the profile, which only support changes. */
  const name = useIndependentAccount().profile.name;
  const [type, setType] = useState(TYPES[0]);
  const [bank, setBank] = useState("BPI");
  const [number, setNumber] = useState("");
  const [isDefault, setIsDefault] = useState(true);
  const isBank = type === TYPES[0];
  /** What Add still waits for, shown as its tip; nothing once the form is complete. */
  const missing = number.replace(/\s/g, "").length < 4 ? `Enter the ${isBank ? "account" : "mobile"} number.` : undefined;

  const submit = () => {
    // What was saved, not what was ticked: a method pending verification doesn't become the default.
    onAdded(addPayout(payoutFrom({ type, bank, name, number, isDefault })));
    onClose();
    setNumber("");
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add a payout method"
      description="Where you withdraw your pay to."
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" disabled={!!missing} title={missing} onClick={submit}>
            Add payout method
          </Button>
        </>
      }
    >
      <Field label="Payout type">
        <Select options={TYPES} value={type} onChange={(e) => setType(e.target.value)} />
      </Field>
      {isBank && (
        <Field label="Bank">
          <Select options={["BPI", "BDO", "UnionBank", "Metrobank"]} value={bank} onChange={(e) => setBank(e.target.value)} />
        </Field>
      )}
      <Field label="Account name" hint="The account must be under your own name. ID check (KYC) is required before your first payout.">
        <span className="relative block">
          <Input readOnly value={name} className="cursor-default !bg-surface-alt pr-11 !text-ink-2" />
          <ICONS.lock size={18} aria-hidden className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-ink-2" />
        </span>
      </Field>
      <Field label={isBank ? "Account number" : "Mobile number"} required>
        <Input value={number} onChange={(e) => setNumber(e.target.value)} placeholder={isBank ? "0000 0000 0000" : "0917 000 0000"} inputMode="numeric" required />
      </Field>
      <Checkbox checked={isDefault} onChange={setIsDefault}>
        Set as default payout method
      </Checkbox>
    </Modal>
  );
}
