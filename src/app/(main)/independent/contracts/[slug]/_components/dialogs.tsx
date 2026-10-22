import { useRouter } from "next/navigation";
import { DisputeForm } from "@/components/portal/disputes";
import { disputeLimit } from "@/lib/contract/view";
import type { EndResult } from "@/lib/demo/contract";
import { caseHref, fileDispute } from "@/lib/demo/disputes";
import type { SetToast } from "@/lib/portal/toast";
import { disputePoints, endToast } from "../_lib/copy";
import type { Dialogs, Tracker } from "../_lib/tracker";
import { CompanyProfileDrawer } from "@/components/independent/company-profile";
import { EndDialog } from "./ending";

/**
 * The page's dialogs: the company's profile, the dispute form, and cancelling or giving notice,
 * opened from the tabs; what filing or ending does is told in the toast. (The post-trial offer has
 * its own, ConversionOfferDialog, which the page opens.)
 */
export function TrackerDialogs({ t, dialogs: d, endContract, onToast }: { t: Tracker; dialogs: Dialogs; endContract: (how: "cancel" | "notice") => EndResult; onToast: SetToast }) {
  const { contract, view } = t;
  const router = useRouter();
  const limit = disputeLimit(contract.rate, view);
  return (
    <>
      {/* IN-049 — the company behind the contract, read-only. */}
      <CompanyProfileDrawer company={contract} tags={t.companyTags} open={d.companyOpen} onClose={() => d.setCompanyOpen(false)} />

      {/* IN-059 — the shared form: a reason must be chosen, and the amount has to be a real sum no
          bigger than what is at stake. Filing sends it to Hireable's queue and tells the Team Builder. */}
      <DisputeForm
        open={d.filing}
        onClose={() => d.setFiling(false)}
        title="File a dispute"
        description={
          // What filing does, in three short points; the last is the chapter rule.
          <span className="mt-1 flex flex-col gap-1">
            {disputePoints(contract).map((p) => (
              <span key={p} className="flex gap-2">
                <span aria-hidden>•</span>
                {p}
              </span>
            ))}
          </span>
        }
        cap={limit.cap}
        capNote={limit.note}
        onFile={async (draft) => {
          const r = await fileDispute({ ref: view.ref, filedBy: "independent", ...draft });
          d.setFiling(false);
          // Straight to the case, where it now waits on the company to respond.
          if (r.ok) router.push(caseHref("independent", r.dispute.id));
          else onToast(r.error, "danger");
        }}
      />

      {/* IN-091 — cancelling before the first day, or giving notice on a running role. */}
      <EndDialog
        open={d.ending}
        contract={contract}
        view={view}
        cancellable={!!t.cancelOpt}
        lastDay={t.noticeOpt?.lastDay}
        onClose={() => d.setEnding(false)}
        onConfirm={() => {
          const r = endContract(t.cancelOpt ? "cancel" : "notice");
          d.setEnding(false);
          onToast(endToast(r), r.ok ? "success" : "danger");
        }}
      />
    </>
  );
}
