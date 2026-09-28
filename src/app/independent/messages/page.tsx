"use client";

import { Initials } from "@/components/independent/ui";
import { Badge } from "@/components/portal/Badge";
import { MessagesPage } from "@/components/portal/MessagesPage";
import { useApplications } from "@/lib/independent/applications";
import { useIndependentContracts } from "@/lib/independent/contracts";
import { conversationsFor } from "@/lib/independent/data";

/** The company's initials at each size the inbox draws a face. */
const FACE = { 38: "size-[38px] text-[12px]", 36: "size-9 text-[12px]", 30: "size-[30px] text-[10px]" } as const;

/** The Independent's inbox; the Team Builder's is the same page (MessagesPage). */
export default function Messages() {
  const { applications, canChat } = useApplications();
  const { contracts } = useIndependentContracts();
  // IN-006 — the thread opens when a company invites them to interview, not when they apply.
  const conversations = conversationsFor({ hired: contracts.length > 0, inPipeline: canChat, role: applications[0]?.title });
  const trial = contracts.find((c) => c.type === "trial" && c.status.label !== "Ended");
  return (
    <MessagesPage
      side="independent"
      conversations={conversations}
      tabs={["conversations", "applications"] as const}
      emptyTab={(tab) =>
        conversations.length > 0
          ? tab === "conversations"
            ? "No contract threads yet — your application thread is under Applications."
            : "Your thread moved to Conversations once you were hired."
          : applications.length > 0
            ? "No threads yet — one opens when a company invites you to interview."
            : "No companies in your pipeline yet."
      }
      emptyThread="Your thread with a Team Builder opens once they invite you to interview."
      face={(c, size) => <Initials text={c.initials} className={`${FACE[size]} rounded-full`} />}
      badge={trial && (
        <Badge variant="solid" tone="trial">
          TRIAL · {trial.day}
        </Badge>
      )}
      video
    />
  );
}
