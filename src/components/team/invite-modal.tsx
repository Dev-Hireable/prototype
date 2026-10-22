"use client";

import { useState } from "react";
import { Button, Field, LinkButton, Modal, Select, Textarea } from "@/components/portal/ui";
import { useWithReturn } from "@/components/portal/return";
import type { Independent, Role } from "@/lib/team/data";
import { useHired } from "@/lib/team/hired";
import { useRoles } from "@/lib/team/roles";
import { usePipeline } from "@/lib/team/pipeline";

/**
 * TB-017 / TB-023 — "Invite to apply", shared by Discover and Saved Independents so the saved
 * list can invite without sending the Team Builder back to Discover first. Picking the role is the
 * point of the modal, so it offers only live roles they aren't on yet; the invite, and the note
 * with it, open the thread in Messages on both sides.
 */
export function InviteModal({ target, onClose, onSent }: { target: Independent | null; onClose: () => void; onSent: (name: string) => void }) {
  const { roles } = useRoles();
  const { candidates } = usePipeline();
  const { nameOf } = useHired();
  const active = roles.filter((r) => r.status === "Active");
  // A role they're already on (invited, applied, or turned down) has them in its pipeline: another invite to it would do nothing.
  const open = active.filter((r) => !candidates.some((c) => c.independent === target?.slug && c.role === r.slug));
  const name = target ? nameOf(target) : "";
  const draft = useInviteDraft(target, open, name, onSent, onClose);
  const first = target?.name.split(" ")[0] ?? "them";

  // An invite is always to a specific live role, so with none there is nothing to send — say so
  // and point at the fix instead of showing an empty dropdown and a dead Send button.
  if (active.length === 0) return <NoLiveRole open={!!target} onClose={onClose} drafts={roles.filter((r) => r.status === "Draft").length} first={first} />;
  if (open.length === 0) return <OnEveryRole open={!!target} onClose={onClose} name={name} roles={active} />;

  return (
    <Modal
      open={!!target}
      onClose={onClose}
      title={`Invite ${name} to apply`}
      description={`${name} gets your invite by email and in Messages.`}
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
      <InviteFields roles={open} draft={draft} first={first} />
    </Modal>
  );
}

/** No live role to invite anyone to yet: publish a draft, or create one. */
function NoLiveRole({ open, onClose, drafts, first }: { open: boolean; onClose: () => void; drafts: number; first: string }) {
  const withReturn = useWithReturn();
  return (
    <Modal
      open={open}
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
}

/** They're already in the pipeline of every live role: another role is what they could be invited to. */
function OnEveryRole({ open, onClose, name, roles }: { open: boolean; onClose: () => void; name: string; roles: Role[] }) {
  const withReturn = useWithReturn();
  const titles = roles.map((r) => r.title);
  const list = titles.length > 1 ? `${titles.slice(0, -1).join(", ")} and ${titles.at(-1)}` : titles[0];
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`${name} is on every live role`}
      description={`${name} is already in your pipeline for ${list}. Post another role to invite them to it.`}
      footer={
        <>
          <Button size="lg" onClick={onClose}>
            Cancel
          </Button>
          <LinkButton size="lg" variant="primary" href={withReturn("/team/hire")}>
            Create role
          </LinkButton>
        </>
      }
    />
  );
}

/**
 * The invite being written: the live role it's for (its slug) and the note, and `send`, which
 * invites the Independent to that role with the note, says so and closes.
 */
function useInviteDraft(target: Independent | null, open: Role[], name: string, onSent: (name: string) => void, onClose: () => void) {
  const { invite } = usePipeline();
  const [picked, setPicked] = useState("");
  // Roles hydrate after mount, so the default can't be fixed in useState: fall back to the first
  // open role whenever nothing valid has been picked yet.
  const role = open.some((r) => r.slug === picked) ? picked : (open[0]?.slug ?? "");
  const [note, setNote] = useState("");

  const send = () => {
    if (!target || !role) return;
    invite(target.slug, role, note);
    onSent(name);
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
      <Field label="Role" required>
        <Select
          required
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
