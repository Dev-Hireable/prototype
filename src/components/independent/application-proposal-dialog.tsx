"use client";

import { LinkButton, Modal } from "@/components/portal/ui";
import { ProposalReview } from "@/components/portal/proposal-review";
import { proposalHistory, useDeal } from "@/lib/demo/deal";
import type { Application } from "@/lib/independent/data";
import { useJobView } from "@/lib/independent/job-view";
import { useIndependentAccount } from "@/lib/independent/account";
import { shortName } from "@/lib/portal/names";

/**
 * TB-106 — the talent's own proposal as the Team Builder reads it, with its versions: the same
 * Review proposal dialog, opened from the application or in place from the proposal's link in
 * Messages, where its steps and notes are. The trial's tasks stay locked until an offer carries them,
 * and the notes for candidates stay private: neither is part of a proposal.
 */
export function ApplicationProposalDialog({ app, open, onClose }: { app: Application; open: boolean; onClose: () => void }) {
  const { profile } = useIndependentAccount();
  const job = useJobView(app);
  const deal = useDeal();
  const live = deal?.roleSlug === app.roleSlug ? deal : null;
  const proposal = live?.proposal;
  if (!proposal || !live) return null;
  const revision = !!live.revision || app.status?.label === "Revision requested";
  return (
    <Modal open={open} onClose={onClose} title={`Your proposal for ${job.title}`} width={760} bare>
      <ProposalReview
        viewer="independent"
        // As the company reads it: "Juan D." until they're hired.
        author={{ name: shortName(profile.name), avatar: profile.photo, role: profile.headline, match: app.match }}
        post={{ title: job.title, type: job.type, duration: job.duration, budget: job.budget, hours: job.hours, tasks: job.tasks, company: job.company, tasksShared: !!live.offer }}
        proposal={proposal}
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
      />
    </Modal>
  );
}
