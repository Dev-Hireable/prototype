"use client";

import { useState } from "react";
import { Button, Field, Modal, Select, Textarea } from "@/components/independent/ui";
import type { Independent } from "@/lib/team/data";
import { useDemo } from "@/lib/team/store";

/**
 * TB-017 / TB-023 — "Invite to apply", shared by Discover and Saved Independents so the saved
 * list can invite without sending the Team Builder back to Discover first. Picking the job post
 * is the point of the modal: the trial expectations on that post are what get unlocked for the
 * Independent when the invite lands.
 */
export function InviteModal({ target, onClose, onSent }: { target: Independent | null; onClose: () => void; onSent: (name: string) => void }) {
  const { roles, invite } = useDemo();
  const active = roles.filter((r) => r.status === "Active");
  const [role, setRole] = useState(active[0]?.slug ?? "");
  const [note, setNote] = useState("");

  const send = () => {
    if (!target) return;
    invite(target.slug, role);
    onSent(target.name);
    setNote("");
    onClose();
  };

  return (
    <Modal
      open={!!target}
      onClose={onClose}
      title={`Invite ${target?.name ?? ""} to apply`}
      description="They get an email and an in-app notification with the role. If they accept, they appear in the candidate tracker as Interested."
      footer={
        <>
          <Button size="lg" onClick={onClose}>
            Cancel
          </Button>
          <Button size="lg" variant="primary" onClick={send} disabled={!role}>
            Send invite
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <Field label="Role">
          <Select
            options={active.map((r) => r.title)}
            value={active.find((r) => r.slug === role)?.title}
            onChange={(e) => setRole(active.find((r) => r.title === e.target.value)?.slug ?? role)}
          />
        </Field>
        <Field label="Note (optional)">
          <Textarea rows={3} className="h-[78px]" value={note} onChange={(e) => setNote(e.target.value)} placeholder={`Tell ${target?.name.split(" ")[0] ?? "them"} why this role fits`} />
        </Field>
      </div>
    </Modal>
  );
}
