"use client";

import { useState } from "react";
import { ICONS } from "@/components/admin/icons";
import { ApplicationProposalDialog } from "@/components/independent/ApplicationProposalDialog";
import { Toast } from "@/components/independent/ui";
import { ProposalReviewDialog } from "@/components/team/ProposalReviewDialog";
import type { ChatSource } from "@/lib/demo/live";
import { useApplications } from "@/lib/independent/applications";
import { useToast, type SetToast } from "@/lib/portal/toast";
import { DEAL_ID } from "@/lib/team/deal-view";
import type { Side } from "@/lib/work/model";
import { useRoles } from "@/lib/team/roles";
import { usePipeline } from "@/lib/team/pipeline";

const Doc = ICONS.notes;

/**
 * TB-106 — the line at the top of a chat bubble written somewhere other than the thread: "On
 * Proposal v2 · Sales Rep". It opens that proposal's Review proposal dialog right over the chat;
 * it used to navigate to the candidate's profile (or the talent's application) to open it there.
 * `mine` sets it on the sender's blue bubble or the other side's white one.
 */
export function ChatSourceLink({ source, side, mine }: { source: ChatSource; side: Side; mine: boolean }) {
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useToast();
  const close = () => setOpen(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`flex max-w-full items-center gap-1.5 self-start rounded-md px-2 py-1 text-[11.5px] leading-[1.2] font-medium hover:underline ${mine ? "bg-white/15 text-white" : "bg-surface-2 text-accent-ink"}`}
      >
        <Doc size={14} aria-hidden className="shrink-0" />
        <span className="truncate">
          On Proposal v{source.version} · {source.title}
        </span>
      </button>
      {open && (side === "team" ? <TeamProposal source={source} onClose={close} onToast={setToast} /> : <IndependentProposal source={source} onClose={close} onToast={setToast} />)}
      <Toast toast={toast} onClose={() => setToast(null)} />
    </>
  );
}

/* Each side reads its own store, so each gets its own component — neither hook runs in the other portal. */

function TeamProposal({ source, onClose, onToast }: { source: ChatSource; onClose: () => void; onToast: SetToast }) {
  const { candidates } = usePipeline();
  const { roles } = useRoles();
  const role = roles.find((r) => r.slug === source.roleSlug);
  const candidate = candidates.find((c) => c.id === DEAL_ID);
  if (!role || !candidate) return null;
  return <ProposalReviewDialog candidate={candidate} role={role} open onClose={onClose} onToast={onToast} />;
}

function IndependentProposal({ source, onClose, onToast }: { source: ChatSource; onClose: () => void; onToast: SetToast }) {
  const { applications } = useApplications();
  const app = applications.find((a) => a.roleSlug === source.roleSlug);
  if (!app) return null;
  return <ApplicationProposalDialog app={app} open onClose={onClose} onToast={onToast} />;
}
