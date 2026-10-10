"use client";

import { Initials } from "@/components/portal/ui";
import { Badge } from "@/components/portal/badge";
import { MessagesPage } from "@/components/portal/messages-page";
import { useApplications } from "@/lib/independent/applications";
import { useIndependentContracts } from "@/lib/independent/contracts";
import { conversationsFor } from "@/lib/independent/data";
import { JOB_TYPE_LABEL } from "@/lib/contract/job-types";
import { useDeal } from "@/lib/demo/deal";
import { threadStage } from "@/lib/portal/stages";

/** The company's initials at each size the inbox draws a face. */
const FACE = { 38: "size-[38px] text-[12px]", 36: "size-9 text-[12px]", 30: "size-[30px] text-[10px]" } as const;

/** The Independent's inbox; the Team Builder's is the same page (MessagesPage). */
export default function Messages() {
  const { applications, canChat } = useApplications();
  const { contracts } = useIndependentContracts();
  // IN-006 — the thread opens when a company invites them to interview, not when they apply.
  const conversations = conversationsFor({ hired: contracts.length > 0, inPipeline: canChat, role: applications[0]?.title });
  const trial = contracts.find((c) => c.type === "trial" && c.status.label !== "Ended");
  const deal = useDeal();
  const contract = contracts[0];
  return (
    <MessagesPage
      side="independent"
      conversations={conversations}
      // Applications first: a thread starts there, and moves to Conversations once you're hired.
      tabs={["applications", "conversations"] as const}
      // With no thread at all, the thread pane says so once; the list stays quiet.
      emptyTab={(tab) => (conversations.length === 0 ? "" : tab === "conversations" ? "No contract threads yet. Your thread is under Applications." : "Your thread moved to Conversations once you were hired.")}
      emptyThread="A thread opens when a Team Builder invites you to interview."
      face={(c, size) => <Initials text={c.initials} className={`${FACE[size]} rounded-full`} />}
      stage={deal ? threadStage(deal.stage, contract ? (contract.status.label === "Ended" ? "Ended" : JOB_TYPE_LABEL[contract.type]) : undefined) : undefined}
      badge={trial && (
        <Badge variant="solid" tone="trial">
          TRIAL · {trial.day}
        </Badge>
      )}
      video
    />
  );
}
