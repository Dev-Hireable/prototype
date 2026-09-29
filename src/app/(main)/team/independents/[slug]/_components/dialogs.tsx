import { useRouter } from "next/navigation";
import { DisputeForm } from "@/components/portal/disputes";
import { disputeLimit } from "@/lib/contract/view";
import { caseHref, fileDispute } from "@/lib/demo/disputes";
import { JOB_TYPE_LABEL } from "@/lib/contract/job-types";
import type { SetToast } from "@/lib/portal/toast";
import { useTeamContracts } from "@/lib/team/contracts";
import { useOffers } from "@/lib/team/offers";
import type { TrackerActions } from "../_lib/actions";
import { endToast, noticeToast } from "../_lib/copy";
import type { Tracker } from "../_lib/tracker";
import { EndDialog } from "./end-dialog";
import { HireDialog } from "./hire-dialog";

/** The tracker's three dialogs: hire after the trial, file a dispute, and end the contract. */
export function TrackerDialogs({ t, on, onToast }: { t: Tracker; on: TrackerActions; onToast: SetToast }) {
  const { sendConversionOffer } = useOffers();
  const { endContract } = useTeamContracts();
  const { contract, first } = t;
  return (
    <>
      <HireDialog
        open={on.converting}
        first={first}
        hire={on.hire}
        setHire={on.setHire}
        onClose={() => on.setConverting(false)}
        onSend={(offer) => {
          const sent = sendConversionOffer(offer);
          on.setConverting(false);
          onToast(sent ? `${JOB_TYPE_LABEL[offer.type]} offer sent to ${first}` : "The offer couldn't be sent. Pick a start date from today on, and try again.", sent ? "success" : "danger");
        }}
      />

      {/* TB-073 / TB-118 — the shared form: a reason must be chosen, and the amount has to be a
          real sum no bigger than what the escrow still holds. */}
      <DisputeDialog t={t} open={on.disputing} onClose={() => on.setDisputing(false)} onToast={onToast} />

      <EndDialog
        t={t}
        open={on.ending}
        onClose={() => on.setEnding(false)}
        onNotice={() => {
          const r = endContract(contract.slug, "notice");
          on.setEnding(false);
          onToast(noticeToast(r, first), r.ok ? "success" : "danger");
        }}
        onEnd={(how) => {
          const r = endContract(contract.slug, how);
          on.setEnding(false);
          onToast(endToast(r, first), r.ok ? "success" : "danger");
        }}
      />
    </>
  );
}

/** Filing a dispute about this contract, capped at what the escrow can still pay out; once filed, the case opens. */
function DisputeDialog({ t, open, onClose, onToast }: { t: Tracker; open: boolean; onClose: () => void; onToast: SetToast }) {
  const router = useRouter();
  const { contract, view, name } = t;
  const limit = disputeLimit(contract.rate, view, "a month's pay");
  return (
    <DisputeForm
      open={open}
      onClose={onClose}
      title={`File a dispute about ${name}`}
      description="Hireable support reviews the contract, the task log and the payment record — the process, not the quality of the work. The amount in question stays put until they rule, and both sides are notified."
      cap={limit.cap}
      capNote={limit.note}
      onFile={async (form) => {
        const r = await fileDispute({ ref: view.ref, filedBy: "team", ...form });
        onClose();
        // Straight to the case, where it now waits on the independent to respond.
        if (r.ok) router.push(caseHref("team", r.dispute.id));
        else onToast(r.error, "danger");
      }}
    />
  );
}
