"use client";

import { Initials } from "@/components/portal/ui";
import { Badge } from "@/components/portal/badge";
import { MessagesPage } from "@/components/portal/messages-page";
import { CompanyProfileDrawer } from "@/components/independent/company-profile";
import { useApplications } from "@/lib/independent/applications";
import { useIndependentContracts } from "@/lib/independent/contracts";
import { conversationsFor } from "@/lib/independent/data";
import { JOB_TYPE_LABEL } from "@/lib/contract/job-types";
import { useDeal, useInvites, usePostings } from "@/lib/demo/deal";
import { PAIR } from "@/lib/demo/live";
import { storedWorkStyle, traitTagsFor } from "@/lib/demo/work-style";
import { threadStage } from "@/lib/portal/stages";

/** The company's initials at each size the inbox draws a face. */
const FACE = { 38: "size-[38px] text-[12px]", 36: "size-9 text-[12px]", 30: "size-[30px] text-[10px]" } as const;

/** The Independent's inbox; the Team Builder's is the same page (MessagesPage). */
export default function Messages() {
  const { applications, canChat } = useApplications();
  const { contracts } = useIndependentContracts();
  /** A role the company invited them to apply to, which opens the thread before any application. */
  const invited = Object.keys(useInvites())[0];
  const invitedTitle = usePostings().find((p) => p.slug === invited)?.title;
  // IN-006 — the thread opens with the first contact: their application, or the invite to apply.
  const conversations = conversationsFor({ hired: contracts.length > 0, inPipeline: canChat || !!invited, role: applications[0]?.title ?? invitedTitle });
  const trial = contracts.find((c) => c.type === "trial" && c.status.label !== "Ended");
  const deal = useDeal();
  const contract = contracts[0];
  return (
    <MessagesPage
      side="independent"
      conversations={conversations}
      // One thread per company; the tabs filter it by stage: Applications while you're in hiring,
      // Conversations once you're working together. Messages opens on the first with a thread in it.
      tabs={["applications", "conversations"] as const}
      // With no thread at all, the thread pane says so once; the list stays quiet.
      emptyTab={(tab) => (conversations.length === 0 ? "" : tab === "applications" ? "No applications in progress." : "No conversations yet.")}
      emptyThread="A thread opens when you apply or a Team Builder invites you."
      face={(c, size) => <Initials text={c.initials} className={`${FACE[size]} rounded-full`} />}
      stage={deal ? threadStage(deal.stage, contract ? (contract.status.label === "Ended" ? "Ended" : JOB_TYPE_LABEL[contract.type]) : undefined) : invited ? "Invited" : undefined}
      badge={trial && (
        <Badge variant="solid" tone="trial">
          TRIAL · {trial.day}
        </Badge>
      )}
      // The name in the thread's header opens the company's profile, the sheet its contract opens.
      profile={({ open, onClose }) => (
        <CompanyProfileDrawer company={{ company: PAIR.team.company, initials: PAIR.team.initials, manager: PAIR.team.name }} tags={traitTagsFor(storedWorkStyle("team"), "team")} open={open} onClose={onClose} />
      )}
    />
  );
}
