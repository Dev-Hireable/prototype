import { Card, StatusDot } from "@/components/independent/ui";
import { Agreement, OfferTerms } from "@/components/portal/OfferParts";
import type { ConversionOffer } from "@/lib/demo/deal";
import type { Contract } from "@/lib/independent/data";
import { FT_BENEFITS } from "@/lib/team/data";
import { offerRows } from "../_lib/terms";

/** The offer itself: its terms, a full-time role's benefits, and the services agreement it's signed under. */
export function OfferCard({ offer, contract }: { offer: ConversionOffer; contract: Contract }) {
  return (
    <Card className="flex min-w-0 flex-1 flex-col gap-6 p-6">
      <div className="flex flex-col gap-4">
        <OfferTerms rows={offerRows(offer, contract)} />
      </div>
      {offer.type === "full-time" && <Benefits included={offer.benefits} />}
      <div className="flex flex-col gap-3">
        <h3 className="text-[16px] leading-[1.5] font-semibold tracking-[0.2px] text-ink">Services Agreement</h3>
        <Agreement type={offer.type} height="h-[260px]" />
      </div>
    </Card>
  );
}

/** Every full-time benefit, each marked included or not as the Team Builder picked them. */
function Benefits({ included }: { included: string[] }) {
  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-[16px] leading-[1.5] font-semibold tracking-[0.2px] text-ink">Exclusive benefits</h3>
      <ul className="flex flex-col gap-2 text-[14px] leading-[1.4]">
        {FT_BENEFITS.map((b) => (
          <li key={b} className="flex items-center justify-between gap-4">
            <span className="text-ink">{b}</span>
            <StatusDot tone={included.includes(b) ? "ok" : "neutral"}>{included.includes(b) ? "Included" : "Not included"}</StatusDot>
          </li>
        ))}
      </ul>
    </div>
  );
}
