"use client";

import { useState } from "react";
import { ICONS } from "@/components/icons";
import { ApplicationOfferDialog } from "@/components/independent/application-offer-dialog";
import { ApplicationProposalDialog } from "@/components/independent/application-proposal-dialog";
import { ConversionOfferDialog } from "@/components/independent/conversion-offer-dialog";
import { Toast } from "@/components/portal/ui";
import { OfferDialog } from "@/components/team/offer-dialog";
import { ProposalReviewDialog } from "@/components/team/proposal-review-dialog";
import type { ChatSource } from "@/lib/demo/live";
import { useApplications } from "@/lib/independent/applications";
import type { EntryDialog } from "@/lib/portal/entry-dialog";
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
      {open && (side === "team" ? <TeamProposal roleSlug={source.roleSlug} onClose={close} onToast={setToast} /> : <IndependentProposal roleSlug={source.roleSlug} onClose={close} />)}
      <Toast toast={toast} onClose={() => setToast(null)} />
    </>
  );
}

/**
 * A thread entry's View details for a proposal or an offer: it opens that dialog right over the
 * chat, the way a note quoting a proposal does, rather than leaving Messages for the page it's on.
 */
export function EntryDetails({ dialog, side }: { dialog: EntryDialog; side: Side }) {
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useToast();
  const close = () => setOpen(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="font-semibold text-primary hover:underline focus-visible:outline-2 focus-visible:outline-primary">
        View details
      </button>
      {open && (side === "team" ? <TeamEntry dialog={dialog} onClose={close} onToast={setToast} /> : <IndependentEntry dialog={dialog} onClose={close} onToast={setToast} />)}
      <Toast toast={toast} onClose={() => setToast(null)} />
    </>
  );
}

/* Each side reads its own store, so each gets its own component — neither hook runs in the other portal. */

function TeamEntry({ dialog, onClose, onToast }: { dialog: EntryDialog; onClose: () => void; onToast: SetToast }) {
  if (dialog.kind === "offer") return <OfferDialog open onClose={onClose} onToast={onToast} />;
  return dialog.kind === "proposal" && dialog.slug ? <TeamProposal roleSlug={dialog.slug} onClose={onClose} onToast={onToast} /> : null;
}

function IndependentEntry({ dialog, onClose, onToast }: { dialog: EntryDialog; onClose: () => void; onToast: SetToast }) {
  const { applications } = useApplications();
  if (dialog.kind === "hire-offer") return <ConversionOfferDialog slug={dialog.slug} open onClose={onClose} onToast={onToast} />;
  const app = applications.find((a) => a.id === dialog.app);
  if (!app) return null;
  return dialog.kind === "offer" ? <ApplicationOfferDialog app={app} open onClose={onClose} /> : <ApplicationProposalDialog app={app} open onClose={onClose} />;
}

function TeamProposal({ roleSlug, onClose, onToast }: { roleSlug: string; onClose: () => void; onToast: SetToast }) {
  const { candidates } = usePipeline();
  const { roles } = useRoles();
  const role = roles.find((r) => r.slug === roleSlug);
  const candidate = candidates.find((c) => c.id === DEAL_ID);
  if (!role || !candidate) return null;
  return <ProposalReviewDialog candidate={candidate} role={role} open onClose={onClose} onToast={onToast} />;
}

function IndependentProposal({ roleSlug, onClose }: { roleSlug: string; onClose: () => void }) {
  const { applications } = useApplications();
  const app = applications.find((a) => a.roleSlug === roleSlug);
  if (!app) return null;
  return <ApplicationProposalDialog app={app} open onClose={onClose} />;
}
