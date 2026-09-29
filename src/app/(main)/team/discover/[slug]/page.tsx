"use client";

import { notFound } from "next/navigation";
import { use, useState } from "react";
import { Page, Toast } from "@/components/portal/ui";
import { BreadcrumbBack } from "@/components/portal/nav";
import { InviteModal } from "@/components/team/invite-modal";
import { TeamProfile } from "@/components/team/ui";
import { useToast } from "@/lib/portal/toast";
import { liveIndependents } from "@/lib/team/data";
import { ReturnNav } from "@/components/portal/return";

/**
 * Full independent profile — the same Contra-style profile the talent sees as their own (IN-060),
 * with the match and Invite to apply / Save as a Team Builder's.
 */
export default function IndependentProfile({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const person = liveIndependents().find((p) => p.slug === slug);
  if (!person) notFound();
  const [inviting, setInviting] = useState(false);
  const [toast, setToast] = useToast();

  return (
    <Page title="Discover independents" nav={<ReturnNav fallback={<BreadcrumbBack href="/team/discover">Back to independents</BreadcrumbBack>} />}>
      <TeamProfile person={person} onInvite={() => setInviting(true)} onPlayIntro={() => setToast("Intro video plays here", "info")} />

      <InviteModal target={inviting ? person : null} onClose={() => setInviting(false)} onSent={(name) => setToast(`Invite sent to ${name}`)} />
      <Toast toast={toast} onClose={() => setToast(null)} />
    </Page>
  );
}
