'use client';

import type { RefObject } from 'react';

import { Button } from '@/web-app/components/ui/button';
import { WorkstyleTraitTag } from '@/web-app/components/ui/worktrait-tag';
import type { PublicSignupRole } from '@/web-app/lib/auth/auth-role-mapping';
import type { QuizTagMetadata } from '@/web-app/lib/workstyle/tag-metadata';
import type { ResultsCopy } from '../../_data/onboarding-copy';
import { getWorkstyleResultsSummary } from '../../_lib/onboarding-results-summary';

const RESULTS_BADGE_VIDEO_SRC =
  '/animation/Onboarding%20Quiz%20Result%20Animation.mp4';

type VisibleTag = {
  key: string;
  label: string;
  questionIndex: number;
};

function buildVisibleWorkstyleTags(workstyleTags: string[]): VisibleTag[] {
  const seenTags = new Map<string, number>();

  return workstyleTags.slice(0, 6).map((tag, questionIndex) => {
    const occurrence = (seenTags.get(tag) ?? 0) + 1;
    seenTags.set(tag, occurrence);

    return {
      key: `${tag}-${occurrence}`,
      label: tag,
      questionIndex,
    };
  });
}

/** The results' badge: the looping result animation, labelled for screen readers. */
function ResultsBadge({ badgeAlt }: { badgeAlt: string }) {
  return (
    <div
      data-results-badge
      className="relative order-0 flex w-full max-w-[280px] flex-none items-center justify-center rounded-2xl bg-background"
    >
      <div className="relative aspect-14/11 w-full overflow-hidden rounded-2xl">
        <video
          data-results-video
          aria-label={badgeAlt}
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          className="absolute inset-0 h-full w-full rounded-2xl bg-background object-cover"
        >
          <source src={RESULTS_BADGE_VIDEO_SRC} type="video/mp4" />
          {badgeAlt}
        </video>
      </div>
    </div>
  );
}

/** The profile's title and what its traits are for. */
function ResultsHeader({ copy }: { copy: ResultsCopy }) {
  return (
    <div
      data-results-header
      className="order-0 flex w-full max-w-[749px] flex-none flex-col items-center gap-2 self-stretch"
    >
      <h1 className="font-sans text-foreground w-full text-center text-[1.85rem] leading-[125%] font-semibold text-balance sm:text-[2rem] sm:leading-[150%]">
        {copy.title}
      </h1>
      <p className="font-secondary text-text-tertiary flex w-full max-w-[749px] flex-none items-center justify-center self-stretch text-center text-sm leading-[145%] tracking-[0.2px] text-balance sm:text-base sm:leading-[150%]">
        {copy.description}
      </p>
    </div>
  );
}

/** The quiz's work-style tags, the first six of them, or a note when there are none. */
function ResultsTags({
  tagMetadata,
  workstyleTags,
}: {
  tagMetadata: QuizTagMetadata;
  workstyleTags: string[];
}) {
  const visibleWorkstyleTags = buildVisibleWorkstyleTags(workstyleTags);

  return (
    <div
      data-results-tags
      className="order-1 flex w-full max-w-[829px] flex-none flex-row flex-wrap content-center items-start justify-center gap-2 p-0 lg:h-[33px] lg:flex-nowrap"
    >
      {visibleWorkstyleTags.length > 0 ? (
        visibleWorkstyleTags.map((tag) => (
          <div key={tag.key} className="worktrait-tag lg:shrink-0">
            <WorkstyleTraitTag
              label={tag.label}
              questionIndex={tag.questionIndex}
              tagMetadata={tagMetadata}
              size="lg"
            />
          </div>
        ))
      ) : (
        <p className="worktrait-tag text-muted-foreground text-center text-sm">
          Complete the quiz to see your workstyle tags.
        </p>
      )}
    </div>
  );
}

/** Who these traits match best: an Independent for a Team Builder, a Team Builder for talent. */
function ResultsSummary({
  role,
  tagMetadata,
  workstyleTags,
}: {
  role: PublicSignupRole;
  tagMetadata: QuizTagMetadata;
  workstyleTags: string[];
}) {
  const summary = getWorkstyleResultsSummary({
    role,
    tags: workstyleTags,
    tagMetadata,
  });
  const matchHeading =
    role === 'client'
      ? 'Your Ideal Independent Match'
      : 'Your Ideal Team Builder Match';

  return (
    <div
      data-results-summary
      className="border-border box-border order-2 flex min-h-[129px] w-full max-w-[749px] flex-none flex-col items-start self-stretch gap-3 rounded-lg border bg-background px-4 pt-4 pb-4 sm:px-6 sm:pt-5 sm:pb-5"
    >
      <p className="font-secondary text-text-tertiary order-0 w-full flex-none self-stretch text-[12px] leading-[120%] font-semibold tracking-[0.2px] uppercase">
        {matchHeading}
      </p>
      <p className="font-secondary text-foreground order-1 w-full flex-none self-stretch text-[14px] leading-[120%] font-normal tracking-[0.2px]">
        {summary}
      </p>
    </div>
  );
}

type OnboardingResultsContentProps = {
  containerRef: RefObject<HTMLDivElement | null>;
  copy: ResultsCopy;
  isNavigating: boolean;
  onContinue: () => void;
  role: PublicSignupRole;
  tagMetadata: QuizTagMetadata;
  workstyleTags: string[];
};

export function OnboardingResultsContent({
  containerRef,
  copy,
  isNavigating,
  onContinue,
  role,
  tagMetadata,
  workstyleTags,
}: OnboardingResultsContentProps) {
  return (
    <section className="flex flex-1 items-center justify-center px-4 py-6 sm:px-6 sm:py-8">
      <div
        ref={containerRef}
        className="flex w-full max-w-[1205px] flex-col items-center justify-center gap-6 sm:min-h-[661px]"
      >
        <ResultsBadge badgeAlt={copy.badgeAlt} />

        <div className="flex w-full max-w-[829px] flex-none flex-col items-center justify-center gap-6 px-0 sm:gap-10 sm:px-10">
          <ResultsHeader copy={copy} />

          <ResultsTags
            tagMetadata={tagMetadata}
            workstyleTags={workstyleTags}
          />

          <ResultsSummary
            role={role}
            tagMetadata={tagMetadata}
            workstyleTags={workstyleTags}
          />

          <div
            data-results-button
            className="order-3 flex w-full flex-none justify-center"
          >
            <Button
              variant="primary"
              size="default"
              onClick={onContinue}
              disabled={isNavigating}
              isLoading={isNavigating}
              className="h-12 w-full max-w-[260px] rounded-lg px-5 text-base leading-[96%] font-medium sm:w-[195px]"
            >
              View dashboard
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
