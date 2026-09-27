"use client";

import { notFound, useRouter } from "next/navigation";
import { use } from "react";
import { Page } from "@/components/independent/ui";
import { useDeal } from "@/lib/demo/deal";
import { usd } from "@/lib/demo/disputes";
import { byName } from "@/lib/team/data";
import { DEAL_ID } from "@/lib/team/deal-view";
import { useOffers } from "@/lib/team/offers";
import { useRoles } from "@/lib/team/roles";
import { ClosedOffer } from "./_components/Closed";
import { EditHeading } from "./_components/Heading";
import { SignCard } from "./_components/SignCard";
import { TermsCard } from "./_components/TermsCard";
import { offerEdit, useOfferEdits } from "./_lib/edit";

/**
 * Figma "Hire / Edit sent offer": same frame as the Independent offer page (px 140, 1080 wide, left card + 360 sign card),
 * headed "Edit the offer to …" with the amber "not signed yet" note.
 *
 * The editable terms follow the offer's type: a trial's rate and start date (its end date and escrow
 * follow), or an ongoing role's pay, start date and — part-time — hours a week. The tasks the offer
 * sets can be changed too. The talent is told and signs the new version.
 */
export default function EditOffer({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { roles } = useRoles();
  const { offers, updateOffer } = useOffers();
  const deal = useDeal();
  const router = useRouter();
  const live = id === DEAL_ID ? deal?.offer : undefined;
  const { rate, setRate, start, setStart, hours, setHours, taskRows, setTaskRows, name, setName, agree, setAgree } = useOfferEdits(live);
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

  const edit = offerEdit(live, role, { rate, start, hours, taskRows, name, agree });
  const { trial, partTime, amount, end, escrow, fee, weekly, tasks } = edit;
  const send = () => {
    const offerTasks = tasks.map((t, i) => ({ ...t, id: `task-${i + 1}` }));
    const sent = updateOffer(trial ? { rate: `${usd(amount)}/mo`, start, end, deposit: { escrow, fee }, tasks: offerTasks } : { rate: `${usd(amount)}/mo`, start, hours: partTime ? weekly : undefined, tasks: offerTasks });
    // Answered in the meantime: the page stays, now saying what happened to the offer.
    if (sent) back();
  };

  return (
    <Page title="Edit offer" heading="modal" onClose={back} padded={false}>
      <div className="mx-auto flex w-[1080px] flex-col gap-10 pt-10 pb-20">
        <EditHeading name={p.name} first={first} sent={live.sent} edit={edit} />

        <div className="flex items-start gap-6">
          <TermsCard
            live={live}
            role={role}
            edit={edit}
            first={first}
            rate={rate}
            onRate={setRate}
            onStart={setStart}
            hours={hours}
            onHours={setHours}
            taskRows={taskRows}
            onTaskRows={setTaskRows}
          />

          <SignCard person={p} role={role} edit={edit} name={name} onName={setName} agree={agree} onAgree={setAgree} onSend={send} onCancel={back} />
        </div>
      </div>
    </Page>
  );
}
