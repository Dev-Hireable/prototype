"use client";

import { Button, Modal } from "@/components/portal/ui";
import { shortName } from "@/lib/portal/names";
import { byName, type Candidate } from "@/lib/team/data";
import { usePipeline } from "@/lib/team/pipeline";

/**
 * TB-044 — declining a candidate, or restoring them, is a decision: it's confirmed here first, never
 * done on a single click. The board's card and the candidate's profile open the same dialog. Neither
 * notifies them; their own application shows it's closed, and the step is in the thread.
 */
export function DropDialog({ candidate, role, onClose, onDone }: { candidate: Candidate | null; role: string; onClose: () => void; onDone: (message: string) => void }) {
  const { setDropped } = usePipeline();
  if (!candidate) return null;
  // Not hired, so the surname stays an initial ("Juan D.").
  const name = shortName(byName(candidate.independent).name);
  const first = name.split(" ")[0];
  const restore = !!candidate.dropped;
  return (
    <Modal
      open
      onClose={onClose}
      tone={restore ? "default" : "danger"}
      title={restore ? `Restore ${first}?` : `Decline ${first} for ${role}?`}
      description={restore ? `${first} goes back to the stage they were in.` : `${first} will see this application as closed. You can restore them later.`}
      footer={
        <>
          <Button size="lg" onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="lg"
            variant={restore ? "primary" : "danger"}
            onClick={() => {
              setDropped(candidate.id, !restore);
              onClose();
              onDone(restore ? `${name} is back in the pipeline` : `Declined ${name} for ${role}`);
            }}
          >
            {restore ? "Restore candidate" : "Decline candidate"}
          </Button>
        </>
      }
    />
  );
}
