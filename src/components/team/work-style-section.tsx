"use client";

import { useState } from "react";
import { Button, LinkButton } from "@/components/portal/ui";
import { ProfileSection } from "@/components/portal/profile-editor";
import { RetakeQuizDialog } from "@/components/portal/retake-quiz-dialog";
import { Tip } from "@/components/portal/tip";
import { TraitTag } from "@/components/portal/trait-tag";
import { dayLabel } from "@/lib/portal/dates";
import { useNextRetake } from "@/lib/demo/retake";
import { quizPath, traitTagsFor } from "@/lib/demo/work-style";
import { useTeamAccount } from "@/lib/team/account";

/**
 * TB-096 — the company's work-style tags, from its quiz: shown on the company profile and used for
 * matching. The personal profile and the company profile show this same section, with the same
 * Retake quiz, which asks first and can be used once a year.
 */
export function WorkStyleSection() {
  const { workStyle } = useTeamAccount();
  const [asking, setAsking] = useState(false);
  /** When the company may retake the quiz, or null when it may now. */
  const opensOn = useNextRetake("team");
  const tags = traitTagsFor(workStyle, "team");
  return (
    <>
      <ProfileSection
        title="Work style"
        description="From your work style quiz. Shown on your company profile and used for matching."
        action={
          tags.length ? (
            <Tip label={opensOn ? `You can retake the quiz on ${dayLabel(opensOn)}.` : undefined} wrap>
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

      <RetakeQuizDialog side="team" open={asking} onClose={() => setAsking(false)} />
    </>
  );
}
