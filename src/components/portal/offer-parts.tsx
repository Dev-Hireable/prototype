"use client";

import Image from "next/image";
import { useId, useState, type ReactNode } from "react";
import { ICONS } from "@/components/icons";
import { Button, Checkbox, Field, Modal, Textarea } from "@/components/portal/ui";
import type { JobType } from "@/lib/contract/job-types";
import { PAIR } from "@/lib/demo/live";
import { agreementFor } from "@/lib/contract/agreement";
import { signatureMatches } from "@/lib/portal/names";

/*
 * The pieces every offer page is built from — the talent's offer, the post-trial offer and the Team
 * Builder's edit of a sent offer — so the three read as one design.
 */

/** "Offer Details": the terms, a row each, label left and value right. */
export function OfferTerms({ rows }: { rows: [string, ReactNode][] }) {
  return (
    <>
      <h3 className="text-[16px] leading-[1.5] font-semibold tracking-[0.2px] text-ink">Offer Details</h3>
      <dl className="flex flex-col text-[14px] leading-[1.2] tracking-[0.2px]">
        {rows.map(([k, v]) => (
          <div key={k} className="flex items-center justify-between border-b border-[#e5e5e5] pt-3 pb-[13px]">
            <dt className="text-ink-2">{k}</dt>
            <dd className="text-[#101828]">{v}</dd>
          </div>
        ))}
      </dl>
    </>
  );
}

/**
 * The typed-name signature and the tick on the platform contract that every offer is signed with.
 * With `fullName`, the signature has to be the account's name (signatureMatches): the label names
 * it, and a name that doesn't match says so under the field once the field is left. Once the offer
 * is accepted (`signed`), it reads who signed and when, with the tick kept and locked.
 */
export function Signature({ name, onName, agree, onAgree, disabled, fullName, signed }: { name: string; onName: (name: string) => void; agree: boolean; onAgree: (agree: boolean) => void; disabled?: boolean; fullName?: string; signed?: { name: string; on?: string } }) {
  const id = useId();
  const [left, setLeft] = useState(false);
  const wrong = fullName !== undefined && left && name.trim() !== "" && !signatureMatches(name, fullName);
  if (signed) return <SignedBy signed={signed} />;
  return (
    <>
      <label htmlFor={id} className="text-[14px] leading-[1.2] tracking-[0.2px] text-ink-2">
        {fullName !== undefined ? `Type your full name exactly as on your account (${fullName})` : "Type your full name to sign. This is your electronic signature confirming commitment to the offer terms."}
      </label>
      <input
        id={id}
        value={name}
        onChange={(e) => onName(e.target.value)}
        onBlur={() => setLeft(true)}
        placeholder="Your full name"
        disabled={disabled}
        required={fullName !== undefined}
        aria-invalid={wrong || undefined}
        aria-describedby={wrong ? `${id}-error` : undefined}
        className="border-b border-border py-2 font-display text-[20px] text-ink italic outline-none placeholder:text-ink-2 focus:border-primary"
        style={{ fontVariationSettings: '"opsz" 14' }}
      />
      {wrong && (
        <p id={`${id}-error`} role="alert" className="-mt-2 text-[13px] leading-[1.2] tracking-[0.2px] text-danger">
          Must match your account name: {fullName}.
        </p>
      )}
      <Checkbox checked={agree} onChange={onAgree} disabled={disabled}>
        <span className="text-[12px] leading-[1.4]">
          I agree to the <span className="text-primary underline">platform contract</span> and <span className="text-primary underline">terms of service</span>.
        </span>
      </Checkbox>
    </>
  );
}

/** An accepted offer's signature, read-only: who signed and the day, with the tick they gave kept and locked. */
function SignedBy({ signed }: { signed: { name: string; on?: string } }) {
  return (
    <>
      <p className="text-[14px] leading-[1.4] tracking-[0.2px] text-ink">
        Signed by {signed.name}
        {signed.on && `, ${signed.on}`}
      </p>
      <Checkbox checked onChange={() => {}} disabled>
        <span className="text-[12px] leading-[1.4]">
          I agree to the <span className="text-primary underline">platform contract</span> and <span className="text-primary underline">terms of service</span>.
        </span>
      </Checkbox>
    </>
  );
}

/**
 * The services agreement for the offer's type, folded behind one line until it's wanted: open, it's
 * the text in its scrolling box, with `title` heading it. It used to be a wall of text on the offer.
 */
export function Agreement({ type, title, height = "h-[320px]" }: { type: JobType; title?: string; height?: "h-[260px]" | "h-[320px]" }) {
  return (
    <details className="group rounded-lg bg-surface-2 outline -outline-offset-1 outline-border">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-lg px-4 py-3 text-[14px] leading-[1.2] font-medium tracking-[0.2px] text-ink focus-visible:outline-2 focus-visible:outline-primary [&::-webkit-details-marker]:hidden">
        Read the services agreement
        <ICONS.chevron size={18} aria-hidden className="shrink-0 text-ink-2 transition-transform group-open:rotate-180" />
      </summary>
      <div className={`flex flex-col gap-6 overflow-y-auto border-t border-border px-4 pt-4 ${height}`}>
        {title && <p className="text-[14px] leading-[1.2] font-semibold tracking-[0.2px] text-ink">{title}</p>}
        <p className="pb-4 text-[14px] leading-[1.2] tracking-[0.2px] whitespace-pre-line text-ink-2">{agreementFor(type)}</p>
      </div>
    </details>
  );
}

/** A 48px band with the rule through the middle, between an offer card's sections. */
export function OfferDivider() {
  return (
    <span aria-hidden className="flex h-12 items-center px-6">
      <span className="h-px w-full bg-[#e5e5e5]" />
    </span>
  );
}

/** "Offer from": the Team Builder the offer comes from and their company, heading the talent's sign card. */
export function OfferFrom({ name, company }: { name: string; company: string }) {
  return (
    <div className="flex flex-col gap-4 p-6">
      <h3 className="text-[16px] leading-[1.5] font-semibold tracking-[0.2px] text-ink">Offer from</h3>
      <div className="flex items-center gap-3">
        <Image src={PAIR.team.avatar} alt="" width={88} height={88} className="size-11 rounded-full object-cover" />
        <div>
          <p className="text-[16px] leading-[1.5] font-semibold tracking-[0.2px] text-ink">{name}</p>
          <p className="text-[14px] leading-[1.2] tracking-[0.2px] text-ink-2">{company}</p>
        </div>
      </div>
    </div>
  );
}

/**
 * Declining an offer: the Team Builder is told, with the talent's reason if they give one. Each offer
 * page words its own title, description and placeholder.
 */
export function DeclineOfferDialog({ open, title, description, placeholder, onClose, onDecline }: { open: boolean; title: string; description: string; placeholder: string; onClose: () => void; onDecline: (reason: string) => void }) {
  const [reason, setReason] = useState("");
  return (
    <Modal
      open={open}
      onClose={onClose}
      tone="danger"
      title={title}
      description={description}
      footer={
        <>
          <Button size="lg" onClick={onClose}>
            Cancel
          </Button>
          <Button size="lg" variant="danger" onClick={() => onDecline(reason)}>
            Decline
          </Button>
        </>
      }
    >
      {/* IN-075 — a reason is optional; declining without one is fine. */}
      <Field label="Reason (optional)">
        <Textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder={placeholder} />
      </Field>
    </Modal>
  );
}
