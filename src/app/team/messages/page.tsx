"use client";

import { Badge } from "@/components/portal/Badge";
import { MessagesPage } from "@/components/portal/MessagesPage";
import { Avatar } from "@/components/team/ui";
import { JOB_TYPE_LABEL } from "@/lib/demo/job-types";
import { useTeamContracts } from "@/lib/team/contracts";
import { conversationsFor } from "@/lib/team/data";
import { usePipeline } from "@/lib/team/pipeline";
import { useRoles } from "@/lib/team/roles";

/** The Team Builder's inbox; the Independent's is the same page (MessagesPage). */
export default function Messages() {
  const { roles } = useRoles();
  const { canChat, candidates } = usePipeline();
  const { contracts } = useTeamContracts();
  const trial = contracts.find((c) => c.type === "trial" && c.status.label !== "Ended");
  const contract = contracts[0];
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
      tabs={["conversations", "candidates"] as const}
      // TB-009 — the tabs split the list the way the sheet defines them: Conversations is talent under
      // an active contract, Candidates anyone with an offer sent or an interview scheduled.
      emptyTab={(tab) =>
        tab === "candidates"
          ? conversations.length > 0
            ? "This thread moved to Conversations when they were hired."
            : "No candidate threads yet — one opens when you invite someone to interview."
          : conversations.length > 0
            ? "No contract threads yet — the candidate thread is under Candidates."
            : "No active contracts yet."
      }
      emptyThread="Invite a candidate to interview, or start a trial, and your thread with them opens here."
      face={(c, size) => <Avatar src={c.avatar} size={size} />}
      badge={trial && (
        <Badge variant="solid" tone="trial">
          TRIAL · {trial.day}
        </Badge>
      )}
    />
  );
}
