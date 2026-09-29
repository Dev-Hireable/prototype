"use client";

import { LinkButton, Modal } from "@/components/portal/ui";
import { ProposalReview } from "@/components/portal/proposal-review";
import { proposalHistory, useDeal } from "@/lib/demo/deal";
import type { Application } from "@/lib/independent/data";
import { useJobView } from "@/lib/independent/job-view";
import { useIndependentAccount } from "@/lib/independent/account";
import { useApplications } from "@/lib/independent/applications";
import type { SetToast } from "@/lib/portal/toast";

/**
 * TB-106 — the talent's own proposal as the Team Builder reads it, with its history: the same
 * Review proposal dialog, opened from the application or in place from a proposal note in Messages.
 */
export function ApplicationProposalDialog({ app, open, onClose, onToast }: { app: Application; open: boolean; onClose: () => void; onToast: SetToast }) {
  const { commentOnProposal } = useApplications();
  const { profile } = useIndependentAccount();
  const job = useJobView(app);
  const deal = useDeal();
  const live = deal?.roleSlug === app.roleSlug ? deal : null;
  const proposal = live?.proposal;
  if (!proposal || !live) return null;
  const revision = !!live.revision || app.status?.label === "Revision requested";
  return (
    <Modal open={open} onClose={onClose} title={`Your proposal for ${job.title}`} width={1100} bare>
      <ProposalReview
        viewer="independent"
        counterpart={job.company}
        author={{ name: profile.name, avatar: profile.photo, role: profile.headline, match: app.match }}
        post={{ title: job.title, type: job.type, duration: job.duration, budget: job.budget, hours: job.hours, expectation: job.expectation, attachment: job.attachment, tasks: job.tasks }}
        proposal={proposal}
        // IN-073 — where each suggested task change stands: accepted, not taken, or awaiting a decision.
        decisions={live.suggestionDecisions}
        history={proposalHistory(live)}
        banner={revision ? `Revision requested. ${job.company} asked for changes before moving forward.` : live.proposalDeclined ? `${job.company} declined this proposal.` : undefined}
        onClose={onClose}
        actions={
          revision ? (
            <LinkButton size="xl" variant="primary" href={`/independent/jobs/applications/${app.id}/proposal?revise=1`} className="flex-1">
              Revise proposal
            </LinkButton>
          ) : undefined
        }
        onSend={(_, text) => commentOnProposal(text)}
        onAttach={(file) => {
          commentOnProposal("", file);
          onToast(`${file.name} sent to ${job.company}`);
        }}
      />
    </Modal>
  );
}
