import { InfoBanner } from "@/components/independent/ui";
import type { OfferEdit } from "../_lib/edit";

/** The page's heading: who the offer is to, what sending an edit does, and the amber note — when it went out, and what's changing. */
export function EditHeading({ name, first, sent, edit }: { name: string; first: string; sent: string; edit: OfferEdit }) {
  const { changed, changes, payLabel, partTime } = edit;
  return (
    <div className="flex flex-col gap-2">
      <h2 className="font-display text-[32px] leading-[1.5] font-semibold text-black" style={{ fontVariationSettings: '"opsz" 14' }}>
        Edit the offer to {name}
      </h2>
      <p className="text-[14px] leading-[1.2] tracking-[0.2px] text-ink-2">Change the terms below. {first} is notified, gets the new version to sign, and the offer they have now is replaced.</p>
      <InfoBanner tone="warn">
        Sent on {sent}, not signed yet.{" "}
        {changed ? `Changing ${changes.join(" · ")}.` : `Edit the ${payLabel.toLowerCase()}, start date${partTime ? ", hours" : ""} or tasks to send an updated version.`}
      </InfoBanner>
    </div>
  );
}
