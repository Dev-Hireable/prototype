"use client";

import { useState, type ReactNode } from "react";
import { ICONS } from "@/components/icons";
import { AddPayoutModal } from "@/components/independent/add-payout-modal";
import { Button, Checkbox, Field, Modal, Select, StatusDot } from "@/components/portal/ui";
import { useIdVerification } from "@/lib/independent/kyc";
import { payoutTitle, useWallet } from "@/lib/independent/wallet";
import type { SetToast } from "@/lib/portal/toast";

const ID_TYPES = ["Passport", "Driver's license", "PhilSys National ID", "UMID"];

/**
 * The demo's ID check: which ID, and that it's the talent's own. The real one hands over to the
 * verification provider for a photo of the ID and a selfie; this stands in for it.
 */
function VerifyIdModal({ open, onClose, onVerified }: { open: boolean; onClose: () => void; onVerified: () => void }) {
  const { verifyId } = useIdVerification();
  const [type, setType] = useState(ID_TYPES[0]);
  const [mine, setMine] = useState(false);
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Verify your ID"
      description="Payouts go only to a verified name. It takes a photo of your ID and a selfie."
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            disabled={!mine}
            title={mine ? undefined : "Confirm the ID is yours first."}
            onClick={() => {
              verifyId();
              onVerified();
              onClose();
            }}
          >
            Verify ID
          </Button>
        </>
      }
    >
      <Field label="ID type">
        <Select options={ID_TYPES} value={type} onChange={(e) => setType(e.target.value)} aria-label="ID type" />
      </Field>
      <Checkbox checked={mine} onChange={setMine}>
        This {type} is mine and in my legal name
      </Checkbox>
    </Modal>
  );
}

/** One readiness line: an icon, what it is with where it stands, and the button that sorts it. */
function StatusRow({ icon, title, status, action }: { icon: ReactNode; title: string; status: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-surface-2 text-ink-2">{icon}</span>
      {/* No min-w-0: the status badge doesn't wrap, so a narrow row moves the button under it instead of running the badge beneath the button. */}
      <span className="flex flex-1 flex-col gap-1 leading-[1.3] tracking-[0.2px]">
        <span className="text-[14px] font-semibold text-ink">{title}</span>
        <span className="text-[13px] text-ink-2">{status}</span>
      </span>
      {action}
    </div>
  );
}

/**
 * The ID check's status, with Verify ID until it's done: on the payout settings, and in the first
 * proposal's checks. Payouts wait on it, so it says so while it's open.
 */
export function IdStatus({ onToast }: { onToast: SetToast }) {
  const { verified, on } = useIdVerification();
  const [open, setOpen] = useState(false);
  return (
    <>
      <StatusRow
        icon={<ICONS.idCheck size={20} aria-hidden />}
        title="ID verification"
        status={verified ? <StatusDot tone="ok">ID verified · {on}</StatusDot> : <StatusDot tone="warn">Verify your ID to receive payouts</StatusDot>}
        action={
          !verified && (
            <Button size="sm" variant="primary" onClick={() => setOpen(true)}>
              Verify ID
            </Button>
          )
        }
      />
      <VerifyIdModal open={open} onClose={() => setOpen(false)} onVerified={() => onToast("ID verified")} />
    </>
  );
}

/** Where the pay goes: the default method, or Add payout method (the shared add dialog) while there's none. */
function PayoutStatus({ onToast }: { onToast: SetToast }) {
  const { payouts } = useWallet();
  const [adding, setAdding] = useState(false);
  const method = payouts.find((m) => m.isDefault) ?? payouts[0];
  return (
    <>
      <StatusRow
        icon={<ICONS.payment size={20} aria-hidden />}
        title="Payout method"
        status={method ? <StatusDot tone="ok">{payoutTitle(method)}</StatusDot> : <StatusDot tone="warn">Add where your pay goes</StatusDot>}
        action={
          !method && (
            <Button size="sm" variant="primary" onClick={() => setAdding(true)}>
              Add payout method
            </Button>
          )
        }
      />
      <AddPayoutModal open={adding} onClose={() => setAdding(false)} onAdded={(m) => onToast(`${m.brand} added`)} />
    </>
  );
}

/**
 * Before the first proposal goes: a payout method and a verified ID, each set up from here. The
 * proposal can't be sent until both are in (proposalBlocker).
 */
export function ProposalReadiness({ onToast }: { onToast: SetToast }) {
  return (
    <section aria-label="Before you send" className="flex flex-col gap-4 rounded-2xl border border-border bg-white p-6">
      <div className="flex flex-col gap-1 leading-[1.4] tracking-[0.2px]">
        <h3 className="text-[16px] font-semibold text-ink">Before your first proposal</h3>
        <p className="text-[13px] text-ink-2">Set up where you&apos;re paid and verify your ID.</p>
      </div>
      <PayoutStatus onToast={onToast} />
      <IdStatus onToast={onToast} />
    </section>
  );
}
