"use client";

import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import { Button, LinkButton, Modal } from "@/components/portal/ui";
import { ProfileSection } from "@/components/portal/profile-editor";
import { Tip } from "@/components/portal/tip";
import { TraitTag } from "@/components/portal/trait-tag";
import { dayLabel } from "@/lib/portal/dates";
import { nextRetake, quizPath, traitTagsFor } from "@/lib/demo/work-style";
import { useTeamAccount } from "@/lib/team/account";

const NO_SUBSCRIBE = () => () => {};
/** When the company may retake the quiz (epoch ms), or 0 when it may now. Read in the browser only. */
const retakeAt = () => nextRetake("team")?.getTime() ?? 0;

/**
 * TB-096 — the company's work-style tags, from its quiz: shown on the company profile and used for
 * matching. The personal profile and the company profile show this same section, with the same
 * Retake quiz, which asks first and can be used once a year.
 */
export function WorkStyleSection() {
  const { workStyle } = useTeamAccount();
  const router = useRouter();
  const [asking, setAsking] = useState(false);
  const opensOn = useSyncExternalStore(NO_SUBSCRIBE, retakeAt, () => 0);
  const tags = traitTagsFor(workStyle, "team");
  return (
    <>
      <ProfileSection
        title="Work style"
        description="From your work style quiz. Shown on your company profile and used for matching."
        action={
          tags.length ? (
            <Tip label={opensOn ? `You can retake the quiz on ${dayLabel(new Date(opensOn))}.` : undefined} wrap>
              <Button size="sm" disabled={!!opensOn} onClick={() => setAsking(true)}>
                Retake quiz
              </Button>
            </Tip>
          ) : (
            <LinkButton size="sm" variant="primary" href={quizPath("team")}>
              Take the quiz
            </LinkButton>
          )
        }
      >
        {tags.length ? (
          <div className="flex flex-wrap gap-2">
            {tags.map((t) => (
              <TraitTag key={`${t.trait}-${t.label}`} tag={t} />
            ))}
          </div>
        ) : (
          <p className="text-[13px] leading-[1.4] text-ink-2">No tags yet. Take the work style quiz and your tags appear here.</p>
        )}
      </ProfileSection>

      <Modal
        open={asking}
        onClose={() => setAsking(false)}
        title="Retake the quiz?"
        description="Your new results replace the current ones. You can retake once a year."
        footer={
          <>
            <Button size="lg" onClick={() => setAsking(false)}>
              Cancel
            </Button>
            <Button size="lg" variant="primary" onClick={() => router.push(quizPath("team"))}>
              Start quiz
            </Button>
          </>
        }
      />
    </>
  );
}
