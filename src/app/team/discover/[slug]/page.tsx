"use client";

import { notFound } from "next/navigation";
import { use, useState } from "react";
import { BackLink, Button, Field, Modal, Page, Select, Textarea, Toast, useToast } from "@/components/independent/ui";
import { IntroCard, ProfileColumn } from "@/components/team/ui";
import { independents } from "@/lib/team/data";
import { useDemo } from "@/lib/team/store";

/** Full independent profile — the candidate profile layout (Figma 11338:8034) with Discover actions in place of the pipeline. */
export default function IndependentProfile({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const person = independents.find((p) => p.slug === slug);
  if (!person) notFound();
  const { saved, toggleSaved, invite, roles } = useDemo();
  const [inviting, setInviting] = useState(false);
  const [role, setRole] = useState(roles[0]?.slug ?? "");
  const [toast, setToast] = useToast();
  const isSaved = saved.includes(person.slug);

  return (
    <Page title="Discover independents" nav={<BackLink href="/team/discover">Back to independents</BackLink>}>
      <div className="flex flex-col gap-10 pb-14">
        <div className="flex items-start justify-center gap-6">
          <div className="flex w-[384px] shrink-0 flex-col gap-4">
            <IntroCard person={person} onPlay={() => setToast("Intro video plays here")} />
            <div className="flex flex-col gap-2">
              <Button size="lg" variant="primary" className="w-full" onClick={() => setInviting(true)}>
                Invite to apply
              </Button>
              <Button size="lg" className="w-full" onClick={() => toggleSaved(person.slug)}>
                {isSaved ? "Saved" : "Save"}
              </Button>
            </div>
          </div>
          <ProfileColumn person={person} />
        </div>
      </div>

      <Modal
        open={inviting}
        onClose={() => setInviting(false)}
        title={`Invite ${person.name} to apply`}
        description="They get the invite by email and in-app and can accept or decline."
        footer={
          <>
            <Button size="lg" onClick={() => setInviting(false)}>
              Cancel
            </Button>
            <Button size="lg" variant="primary" onClick={() => { invite(person.slug, role); setInviting(false); setToast(`Invite sent to ${person.name}`); }}>
              Send invite
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <Field label="Role">
            <Select options={roles.filter((r) => r.status === "Active").map((r) => r.title)} value={roles.find((r) => r.slug === role)?.title} onChange={(e) => setRole(roles.find((r) => r.title === e.target.value)?.slug ?? role)} />
          </Field>
          <Field label="Note (optional)">
            <Textarea rows={3} className="h-[78px]" placeholder="Why you think they’re a fit" />
          </Field>
        </div>
      </Modal>
      <Toast message={toast} onClose={() => setToast(null)} />
    </Page>
  );
}
