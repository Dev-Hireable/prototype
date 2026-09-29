"use client";

import { useState } from "react";
import { Button, Field, LinkButton, Modal, Select, Textarea } from "@/components/independent/ui";
import { useWithReturn } from "@/components/portal/return";
import type { Independent, Role } from "@/lib/team/data";
import { useRoles } from "@/lib/team/roles";
import { usePipeline } from "@/lib/team/pipeline";

/**
 * TB-017 / TB-023 — "Invite to apply", shared by Discover and Saved Independents so the saved
 * list can invite without sending the Team Builder back to Discover first. Picking the job post
 * is the point of the modal: the trial tasks on that post are what get unlocked for the
 * Independent when the invite lands.
 */
export function InviteModal({ target, onClose, onSent }: { target: Independent | null; onClose: () => void; onSent: (name: string) => void }) {
  const { roles } = useRoles();
  const withReturn = useWithReturn();
  const active = roles.filter((r) => r.status === "Active");
  const drafts = roles.filter((r) => r.status === "Draft").length;
  const draft = useInviteDraft(target, active, onSent, onClose);
  const first = target?.name.split(" ")[0] ?? "them";

  // An invite is always to a specific live post, so with none there is nothing to send — say so
  // and point at the fix instead of showing an empty dropdown and a dead Send button.
  if (active.length === 0)
    return (
      <Modal
        open={!!target}
        onClose={onClose}
        title="Post a role first"
        description={
          drafts > 0
            ? `Invites go out for a live role, and you have ${drafts === 1 ? "a draft" : `${drafts} drafts`} but nothing published yet. Publish one and you can invite ${first} to it.`
            : `Invites go out for a live role, so ${first} knows what they're applying to. Create a role and you can invite them to it.`
        }
        footer={
          <>
            <Button size="lg" onClick={onClose}>
              Cancel
            </Button>
            <LinkButton size="lg" variant="primary" href={withReturn(drafts > 0 ? "/team/hire/roles" : "/team/hire")}>
              {drafts > 0 ? "View drafts" : "Create role"}
            </LinkButton>
          </>
        }
      />
    );

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
          <Button size="lg" variant="primary" onClick={draft.send} disabled={!draft.role}>
            Send invite
          </Button>
        </>
      }
    >
      <InviteFields roles={active} draft={draft} first={first} />
    </Modal>
  );
}

/**
 * The invite being written: the live role it's for (its slug) and the note, and `send`, which
 * invites the Independent to that role, says so and closes.
 */
function useInviteDraft(target: Independent | null, active: Role[], onSent: (name: string) => void, onClose: () => void) {
  const { invite } = usePipeline();
  const [picked, setPicked] = useState("");
  // Roles hydrate after mount, so the default can't be fixed in useState: fall back to the first
  // active role whenever nothing valid has been picked yet.
  const role = active.some((r) => r.slug === picked) ? picked : (active[0]?.slug ?? "");
  const [note, setNote] = useState("");

  const send = () => {
    if (!target || !role) return;
    invite(target.slug, role);
    onSent(target.name);
    setNote("");
    onClose();
  };
  return { role, setPicked, note, setNote, send };
}

/** The invite's fields: the live role it's for, picked by its title, and a note to go with it. */
function InviteFields({ roles, draft, first }: { roles: Role[]; draft: ReturnType<typeof useInviteDraft>; first: string }) {
  const { role, setPicked, note, setNote } = draft;
  return (
    <div className="flex flex-col gap-3">
      <Field label="Role">
        <Select
          options={roles.map((r) => r.title)}
          value={roles.find((r) => r.slug === role)?.title}
          onChange={(e) => setPicked(roles.find((r) => r.title === e.target.value)?.slug ?? role)}
        />
      </Field>
      <Field label="Note (optional)">
        <Textarea rows={3} className="h-[78px]" value={note} onChange={(e) => setNote(e.target.value)} placeholder={`Tell ${first} why this role fits`} />
      </Field>
    </div>
  );
}
