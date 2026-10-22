"use client";

import { useRouter } from "next/navigation";
import { Button, Modal } from "@/components/portal/ui";
import { quizPath, type WorkStyleSide } from "@/lib/demo/work-style";

/** What each side is asked before its quiz starts over, in its own words (TB-096 / IN-064). */
const PROMPT: Record<WorkStyleSide, { title: string; description: string }> = {
  team: { title: "Retake the quiz?", description: "Your new results replace the current ones. You can retake once a year." },
  independent: { title: "Retake the work-style quiz?", description: "Your current tags stay until you finish. Your tags and match scores update after. You can retake the quiz once a year." },
};

/**
 * The one prompt behind every Retake quiz: the Team Builder's Work style section, the talent's tags
 * pencil and the dashboards' work style card. Start quiz opens the quiz; nothing changes until then.
 */
export function RetakeQuizDialog({ side, open, onClose }: { side: WorkStyleSide; open: boolean; onClose: () => void }) {
  const router = useRouter();
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={PROMPT[side].title}
      description={PROMPT[side].description}
      footer={
        <>
          <Button size="lg" onClick={onClose}>
            Cancel
          </Button>
          <Button size="lg" variant="primary" onClick={() => router.push(quizPath(side))}>
            Start quiz
          </Button>
        </>
      }
    />
  );
}
