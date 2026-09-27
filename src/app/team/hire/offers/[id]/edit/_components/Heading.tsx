import { InfoBanner } from "@/components/independent/ui";
import type { OfferEdit } from "../_lib/edit";

/** The page's heading: who the offer is to, what sending an edit does, and the amber note — when it went out, and what's changing. */
export function EditHeading({ name, first, sent, revision, answering, edit }: { name: string; first: string; sent: string; revision: number; answering: boolean; edit: OfferEdit }) {
  const { changed, changes, payLabel, partTime } = edit;
  return (
    <div className="flex flex-col gap-2">
      <h2 className="font-display text-[32px] leading-[1.5] font-semibold text-black" style={{ fontVariationSettings: '"opsz" 14' }}>
        Edit the offer to {name}
      </h2>
      <p className="text-[14px] leading-[1.2] tracking-[0.2px] text-ink-2">
        Change the terms below. It goes out as revision {revision + 1}: {first} is told, sees what changed, and signs that — revision {revision} no longer applies.
      </p>
      <InfoBanner tone="warn">
        Revision {revision} sent on {sent}, not signed yet.{" "}
        {changed ? `Changing ${changes.join(" · ")}.` : answering ? `Answer ${first}'s request below — the next revision can keep the terms as they are.` : `Edit the ${payLabel.toLowerCase()}, start date${partTime ? ", hours" : ""} or tasks to send an updated version.`}
      </InfoBanner>
    </div>
  );
}
