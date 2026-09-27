import { InfoBanner, LinkButton } from "@/components/independent/ui";
import type { OfferStatus } from "@/lib/demo/deal";
import { DEAL_ID } from "@/lib/team/deal-view";

/** An offer that has had its answer can't be edited: what happened to it, and the way to the candidate's profile. */
export function ClosedOffer({ status, first, roleSlug }: { status: OfferStatus; first: string; roleSlug: string }) {
  return (
    <div className="mx-auto flex w-[640px] flex-col gap-4 pt-10">
      <InfoBanner tone="warn">This offer was {status} and can&apos;t be edited. {status === "declined" ? `Send ${first} a new offer from their candidate profile instead.` : ""}</InfoBanner>
      <LinkButton size="lg" href={`/team/hire/roles/${roleSlug}/candidates/${DEAL_ID}`} className="self-start">
        Open {first}&apos;s profile
      </LinkButton>
    </div>
  );
}
