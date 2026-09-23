"use client";

import { notFound } from "next/navigation";
import { use, useState } from "react";
import { Button, LinkButton, Page, Toast, useToast } from "@/components/independent/ui";
import { BreadcrumbBack } from "@/components/portal/nav";
import { InviteModal } from "@/components/team/InviteModal";
import { IntroCard, ProfileColumn } from "@/components/team/ui";
import { independents, pipelineHref } from "@/lib/team/data";
import { useDemo } from "@/lib/team/store";
import { ReturnNav, useWithReturn } from "@/components/portal/return";

/** Full independent profile — the candidate profile layout (Figma 11338:8034) with Discover actions in place of the pipeline. */
export default function IndependentProfile({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const person = independents.find((p) => p.slug === slug);
  if (!person) notFound();
  const { saved, toggleSaved, pipelineOf } = useDemo();
  const withReturn = useWithReturn();
  const inPipeline = pipelineOf(person.slug);
  const [inviting, setInviting] = useState(false);
  const [toast, setToast] = useToast();
  const isSaved = saved.includes(person.slug);

  return (
    <Page title="Discover independents" nav={<ReturnNav fallback={<BreadcrumbBack href="/team/discover">Back to independents</BreadcrumbBack>} />}>
      <div className="flex flex-col gap-10 pb-14">
        <div className="flex items-start justify-center gap-6">
          <div className="flex w-[384px] shrink-0 flex-col gap-4">
            <IntroCard person={person} onPlay={() => setToast("Intro video plays here")} />
            <div className="flex flex-col gap-2">
              {/* Already a candidate: their column on the role's board, not a greyed-out label. */}
              {inPipeline ? (
                <LinkButton size="lg" className="w-full" href={withReturn(pipelineHref(inPipeline))}>
                  View in pipeline
                </LinkButton>
              ) : (
                <Button size="lg" variant="primary" className="w-full" onClick={() => setInviting(true)}>
                  Invite to apply
                </Button>
              )}
              <Button size="lg" className="w-full" onClick={() => toggleSaved(person.slug)}>
                {isSaved ? "Saved" : "Save"}
              </Button>
            </div>
          </div>
          <ProfileColumn person={person} />
        </div>
      </div>

      <InviteModal target={inviting ? person : null} onClose={() => setInviting(false)} onSent={(name) => setToast(`Invite sent to ${name}`)} />
      <Toast message={toast} onClose={() => setToast(null)} />
    </Page>
  );
}
