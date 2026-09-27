"use client";

import { notFound, useRouter } from "next/navigation";
import { use, useState } from "react";
import { Page } from "@/components/independent/ui";
import { openRequest, revisionOf, unanswered } from "@/lib/contract/negotiation";
import { useDeal, type DealOffer } from "@/lib/demo/deal";
import { rateAmount, usd } from "@/lib/demo/disputes";
import { applySuggestions, type SuggestionDecision } from "@/lib/demo/suggestions";
import { toDrafts, withIds, type DraftTask } from "@/lib/demo/tasks";
import { formatMoney } from "@/lib/portal/money";
import { byName } from "@/lib/team/data";
import { DEAL_ID } from "@/lib/team/deal-view";
import { useOffers } from "@/lib/team/offers";
import { useRoles } from "@/lib/team/roles";
import { ClosedOffer } from "./_components/Closed";
import { EditHeading } from "./_components/Heading";
import { RequestCard } from "./_components/Request";
import { SignCard } from "./_components/SignCard";
import { TermsCard } from "./_components/TermsCard";
import { offerEdit, useOfferEdits } from "./_lib/edit";

/**
 * Figma "Hire / Edit sent offer": same frame as the Independent offer page (px 140, 1080 wide, left card + 360 sign card),
 * headed "Edit the offer to …" with the amber "not signed yet" note.
 *
 * The editable terms follow the offer's type: a trial's rate and start date (its end date and escrow
 * follow), or an ongoing role's pay, start date and — part-time — hours a week. The tasks the offer
 * sets can be changed too. What goes out is the offer's next revision: the talent is told, reads what
 * changed, and signs it. When they've asked for changes (IN-092), each is answered here first (TB-149).
 */
export default function EditOffer({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { roles } = useRoles();
  const { offers, updateOffer } = useOffers();
  const deal = useDeal();
  const router = useRouter();
  const live = id === DEAL_ID ? deal?.offer : undefined;
  const e = useOfferEdits(live);
  const answers = useAnswers(live, e.setTaskRows);
  const offer = offers.find((o) => o.id === id);
  const role = roles.find((r) => r.slug === deal?.roleSlug);
  if (!offer || !live || !deal || !role) notFound();
  const back = () => router.push("/team/hire/offers");
  const p = byName(offer.independent);
  const first = p.name.split(" ")[0];

  // Only an offer still waiting on an answer can be edited; after a decline the next step is a new offer.
  if (live.status !== "sent")
    return (
      <Page title="Edit offer" heading="modal" onClose={back} padded={false}>
        <ClosedOffer status={live.status} first={first} roleSlug={deal.roleSlug} />
      </Page>
    );

  const request = openRequest(live);
  const edit = offerEdit(live, role, e);
  const { trial, partTime, amount, end, escrow, fee, weekly, tasks } = edit;
  const send = () => {
    const offerTasks = withIds(tasks);
    const sent = updateOffer(trial ? { rate: `${usd(amount)}/mo`, start: e.start, end, deposit: { escrow, fee }, tasks: offerTasks } : { rate: `${usd(amount)}/mo`, start: e.start, hours: partTime ? weekly : undefined, tasks: offerTasks }, answers.decisions);
    // Answered in the meantime: the page stays, now saying what happened to the offer.
    if (sent) back();
  };

  return (
    <Page title="Edit offer" heading="modal" onClose={back} padded={false}>
      <div className="mx-auto flex w-[1080px] flex-col gap-10 pt-10 pb-20">
        <EditHeading name={p.name} first={first} sent={live.updated ?? live.sent} revision={revisionOf(live)} answering={!!request} edit={edit} />
        {request && <RequestCard request={request} first={first} decisions={answers.decisions} onDecide={answers.decide} rate={live.rate} onUseRate={() => e.setRate(formatMoney(String(rateAmount(request.rate ?? ""))))} />}

        <div className="flex items-start gap-6">
          <TermsCard live={live} role={role} edit={edit} first={first} rate={e.rate} onRate={e.setRate} onStart={e.setStart} hours={e.hours} onHours={e.setHours} taskRows={e.taskRows} onTaskRows={e.setTaskRows} />

          <SignCard person={p} role={role} edit={edit} next={revisionOf(live) + 1} answering={!!request} unanswered={unanswered(request, answers.decisions)} name={e.name} onName={e.setName} agree={e.agree} onAgree={e.setAgree} onSend={send} onCancel={back} />
        </div>
      </div>
    </Page>
  );
}

/**
 * The answers to the talent's request, as they're given: each decision starts the task list again
 * from the revision they read, with every change accepted so far applied to it.
 */
function useAnswers(live: DealOffer | undefined, setRows: (rows: DraftTask[]) => void) {
  const [decisions, setDecisions] = useState<Record<string, SuggestionDecision>>({});
  const decide = (sid: string, d: SuggestionDecision) => {
    const next = { ...decisions, [sid]: d };
    setDecisions(next);
    const request = openRequest(live);
    if (live && request) setRows(toDrafts(applySuggestions(live.tasks, request.suggestions, next)));
  };
  return { decisions, decide };
}
