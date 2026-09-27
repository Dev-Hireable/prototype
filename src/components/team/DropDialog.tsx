"use client";

import { Button, Modal } from "@/components/independent/ui";
import { byName, type Candidate } from "@/lib/team/data";
import { usePipeline } from "@/lib/team/pipeline";

/**
 * TB-044 — dropping a candidate, or bringing them back, is a decision: it's confirmed here first,
 * never done on a single click. The board's card and the candidate's profile open the same dialog.
 * Neither side notifies them; their own application does show where it stands.
 */
export function DropDialog({ candidate, role, onClose, onDone }: { candidate: Candidate | null; role: string; onClose: () => void; onDone: (message: string) => void }) {
  const { setDropped } = usePipeline();
  if (!candidate) return null;
  const name = byName(candidate.independent).name;
  const first = name.split(" ")[0];
  const undrop = !!candidate.dropped;
  return (
    <Modal
      open
      onClose={onClose}
      tone={undrop ? "default" : "danger"}
      title={undrop ? `Undrop ${first}?` : `Drop ${first} from ${role}?`}
      description={
        undrop
          ? `${first} goes back to where they were in the tracker, and their application picks up again. They aren't notified.`
          : `${first} moves to the Dropped column. They aren't notified, but their application shows you're not moving forward, and it can't go any further until you undrop them.`
      }
      footer={
        <>
          <Button size="lg" onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="lg"
            variant={undrop ? "primary" : "danger"}
            onClick={() => {
              setDropped(candidate.id, !undrop);
              onClose();
              onDone(undrop ? `${name} is back in the tracker` : `Dropped ${name} from ${role}`);
            }}
          >
            {undrop ? "Undrop candidate" : "Drop candidate"}
          </Button>
        </>
      }
    />
  );
}
