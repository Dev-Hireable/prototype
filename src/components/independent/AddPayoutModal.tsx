"use client";

import { useState } from "react";
import { Button, Checkbox, Field, InfoBanner, Input, Modal, Select } from "./ui";
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
  const [type, setType] = useState(TYPES[0]);
  const [bank, setBank] = useState("BPI");
  const [name, setName] = useState("Juan Dela Cruz");
  const [number, setNumber] = useState("");
  const [isDefault, setIsDefault] = useState(true);
  const isBank = type === TYPES[0];
  /** What Add still waits for, shown as its tip; nothing once the form is complete. */
  const missing = name.trim().length <= 1 ? "Enter the account name." : number.replace(/\s/g, "").length < 4 ? `Enter the ${isBank ? "account" : "mobile"} number.` : undefined;

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
      description="Where Hireable sends your trial payouts and salary."
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" disabled={!!missing} title={missing} onClick={submit}>
            Add payout method
          </Button>
        </>
      }
    >
      <InfoBanner tone="warn">Payout fields are not in the spec yet. Confirm: bank transfer via InstaPay / PESONet, GCash, or Maya, and which details each needs.</InfoBanner>
      <Field label="Payout type">
        <Select options={TYPES} value={type} onChange={(e) => setType(e.target.value)} />
      </Field>
      {isBank && (
        <Field label="Bank">
          <Select options={["BPI", "BDO", "UnionBank", "Metrobank"]} value={bank} onChange={(e) => setBank(e.target.value)} />
        </Field>
      )}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Account name">
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label={isBank ? "Account number" : "Mobile number"}>
          <Input value={number} onChange={(e) => setNumber(e.target.value)} placeholder={isBank ? "0000 0000 0000" : "0917 000 0000"} inputMode="numeric" />
        </Field>
      </div>
      <Checkbox checked={isDefault} onChange={setIsDefault}>
        Set as default payout method
      </Checkbox>
    </Modal>
  );
}
