"use client";

import { Badge } from "@/components/portal/badge";
import { MessagesPage } from "@/components/portal/messages-page";
import { Avatar } from "@/components/portal/ui";
import { ProfileDrawer } from "@/components/team/ui";
import { JOB_TYPE_LABEL } from "@/lib/contract/job-types";
import { useTeamContracts } from "@/lib/team/contracts";
import { byName, conversationsFor } from "@/lib/team/data";
import { usePipeline } from "@/lib/team/pipeline";
import { useRoles } from "@/lib/team/roles";
import { useDeal } from "@/lib/demo/deal";
import { PAIR } from "@/lib/demo/live";
import { threadStage } from "@/lib/portal/stages";
import { isEndedStatus } from "@/lib/contract/lifecycle";

/** The Team Builder's inbox; the Independent's is the same page (MessagesPage). */
export default function Messages() {
  const { roles } = useRoles();
  const { canChat, candidates } = usePipeline();
  const { contracts } = useTeamContracts();
  const trial = contracts.find((c) => c.type === "trial" && !isEndedStatus(c.status));
  const contract = contracts[0];
  const deal = useDeal();
  /** Their card in a role's pipeline: invited to apply, an application, or further on. */
  const card = candidates.find((c) => c.independent === PAIR.independent.slug);
  const pipelineRole = roles.find((r) => r.slug === card?.role)?.title;
  // TB-006 — the thread opens with the first contact: the invite to apply, or their application.
  const conversations = conversationsFor({
    hired: contracts.length > 0,
    inPipeline: canChat || !!card,
    role: contract?.role ?? pipelineRole,
    contract: contract ? (isEndedStatus(contract.status) ? contract.status.label : JOB_TYPE_LABEL[contract.type]) : undefined,
  });
  return (
    <MessagesPage
      side="team"
      conversations={conversations}
      // One thread per person; the tabs filter it by stage. Candidates is everyone still in hiring;
      // Conversations, the people you're working with. Messages opens on the first with a thread in it.
      tabs={["candidates", "conversations"] as const}
      // With no thread at all, the thread pane says so once; the list stays quiet.
      emptyTab={(tab) => (conversations.length === 0 ? "" : tab === "candidates" ? "No candidates in progress." : "No conversations yet.")}
      emptyThread="A thread opens when an Independent applies or you invite them to apply."
      face={(c, size) => <Avatar src={c.avatar} size={size} />}
      stage={deal ? threadStage(deal.stage, contract ? (isEndedStatus(contract.status) ? contract.status.label : JOB_TYPE_LABEL[contract.type]) : undefined) : card ? "Invited" : undefined}
      badge={trial && (
        <Badge variant="solid" tone="trial">
          TRIAL · {trial.day}
        </Badge>
      )}
      // The name in the thread's header opens the Independent's profile, the sheet Discover and the pipeline open.
      profile={({ open, onClose }) => <ProfileDrawer person={open ? byName("juan-dela-cruz") : null} onClose={onClose} />}
    />
  );
}
