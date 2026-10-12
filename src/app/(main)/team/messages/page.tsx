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
import { threadStage } from "@/lib/portal/stages";

/** The Team Builder's inbox; the Independent's is the same page (MessagesPage). */
export default function Messages() {
  const { roles } = useRoles();
  const { canChat, candidates } = usePipeline();
  const { contracts } = useTeamContracts();
  const trial = contracts.find((c) => c.type === "trial" && c.status.label !== "Ended");
  const contract = contracts[0];
  const deal = useDeal();
  const pipelineRole = roles.find((r) => r.slug === candidates.find((c) => c.independent === "juan-dela-cruz")?.role)?.title;
  // TB-006 — a candidate thread opens when they are invited to interview, not when they apply.
  const conversations = conversationsFor({
    hired: contracts.length > 0,
    inPipeline: canChat,
    role: contract?.role ?? pipelineRole,
    contract: contract ? (contract.status.label === "Ended" ? "Ended" : JOB_TYPE_LABEL[contract.type]) : undefined,
  });
  return (
    <MessagesPage
      side="team"
      conversations={conversations}
      // Candidates first: a thread starts there, and moves to Conversations once they're hired.
      tabs={["candidates", "conversations"] as const}
      // TB-009 — the tabs split the list the way the sheet defines them: Conversations is talent under
      // an active contract, Candidates anyone with an offer sent or an interview scheduled.
      // With no thread at all, the thread pane says so once; the list stays quiet.
      emptyTab={(tab) => (conversations.length === 0 ? "" : tab === "candidates" ? "This thread moved to Conversations when they were hired." : "No contract threads yet. The thread is under Candidates.")}
      emptyThread="A thread opens when you invite someone to interview."
      face={(c, size) => <Avatar src={c.avatar} size={size} />}
      stage={deal ? threadStage(deal.stage, contract ? (contract.status.label === "Ended" ? "Ended" : JOB_TYPE_LABEL[contract.type]) : undefined) : undefined}
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
