import { useRouter } from "next/navigation";
import { DisputeForm } from "@/components/portal/disputes";
import { disputeLimit } from "@/lib/contract/view";
import type { EndResult } from "@/lib/demo/contract";
import { caseHref, fileDispute } from "@/lib/demo/disputes";
import type { SetToast } from "@/lib/portal/toast";
import { endToast } from "../_lib/copy";
import type { Dialogs, Tracker } from "../_lib/tracker";
import { CompanyDialog } from "./company";
import { EndDialog } from "./ending";

/**
 * The page's three dialogs — the company's profile, the dispute form, and cancelling or giving
 * notice — opened from the tabs and the header; what filing or ending does is told in the toast.
 */
export function TrackerDialogs({ t, dialogs: d, endContract, onToast }: { t: Tracker; dialogs: Dialogs; endContract: (how: "cancel" | "notice") => EndResult; onToast: SetToast }) {
  const { contract, view } = t;
  const router = useRouter();
  const limit = disputeLimit(contract.rate, view, `a month's pay, ${contract.rate}`);
  return (
    <>
      {/* IN-049 — the company behind the contract, read-only. */}
      <CompanyDialog contract={contract} tags={t.companyTags} open={d.companyOpen} onClose={() => d.setCompanyOpen(false)} />

      {/* IN-059 — the shared form: a reason must be chosen, and the amount has to be a real sum no
          bigger than what is at stake. Filing sends it to Hireable's queue and tells the Team Builder. */}
      <DisputeForm
        open={d.filing}
        onClose={() => d.setFiling(false)}
        title="File a dispute"
        description={`Hireable support checks the process on the ${contract.title} contract — the approved tasks, the payment record and the dates. The amount stays put until they rule, and you can file one dispute per contract.`}
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
