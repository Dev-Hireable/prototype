'use client';

import Image from 'next/image';
import Link from 'next/link';

import type { WorkStyleTag } from '@/lib/demo/work-style';
import { Button } from '@/web-app/components/ui/button';
import { WorkstyleTraitTag } from '@/web-app/components/ui/worktrait-tag';
import type { QuizTagMetadata } from '@/web-app/lib/workstyle/tag-metadata';
import {
  RETAKE_KEEP_LABEL,
  RETAKE_TRAITS_LABEL,
  type IntroCopy,
} from '../../_data/onboarding-copy';

/** A retake's extras on the intro: the traits it will replace, and a way out that keeps them. */
export type IntroRetake = {
  traits: WorkStyleTag[];
  tagMetadata: QuizTagMetadata;
  keepHref: string;
};

const SUCCESS_TITLE_INITIAL_STYLE = {
  opacity: 0,
  transform: 'translateY(30px)',
} as const;

export function OnboardingSuccessSplash({
  copy,
  successImageRef,
  successTitleRef,
  onImageReady,
}: {
  copy: IntroCopy;
  successImageRef: React.RefObject<HTMLDivElement | null>;
  successTitleRef: React.RefObject<HTMLHeadingElement | null>;
  onImageReady: () => void;
}) {
  return (
    <div
      key="success"
      className="absolute inset-0 flex flex-col items-center justify-center gap-6 pb-10 text-center"
    >
      <div
        ref={successImageRef}
        className="relative size-50"
        style={{ opacity: 0, transform: 'translateY(30px) scale(0.8)' }}
      >
        <Image
          src={copy.successImage}
          alt={copy.successAlt}
          fill
          sizes="200px"
          className="object-contain"
          preload
          unoptimized
          onLoad={onImageReady}
          onError={onImageReady}
        />
      </div>
      <h1
        ref={successTitleRef}
        className="text-foreground w-full max-w-md text-center text-3xl font-semibold leading-[1.2] whitespace-pre-wrap select-text sm:max-w-2xl sm:text-4xl lg:max-w-none lg:text-5xl"
        style={SUCCESS_TITLE_INITIAL_STYLE}
      >
        {copy.successMessage}
      </h1>
    </div>
  );
}

/**
 * The intro's heading: its title and description and, on a retake, the traits the quiz is about to
 * replace.
 */
function IntroHeading({
  copy,
  retake,
}: {
  copy: IntroCopy;
  retake: IntroRetake | null;
}) {
  return (
    <div className="flex w-full flex-col items-center gap-4 text-center">
      <h1 className="text-foreground w-full text-3xl font-semibold leading-[1.2] text-balance sm:text-4xl lg:text-5xl">
        {copy.title}
      </h1>
      {copy.description ? (
        <p className="text-muted-foreground mt-2 text-sm leading-normal text-balance">
          {copy.description}
        </p>
      ) : null}
      {retake && retake.traits.length > 0 ? (
        <div className="mt-4 flex flex-col items-center gap-3">
          <p className="text-muted-foreground text-xs font-semibold uppercase leading-[120%] tracking-[0.2px]">
            {RETAKE_TRAITS_LABEL}
          </p>
          <div className="flex max-w-120 flex-wrap justify-center gap-2">
            {retake.traits.map((trait) => (
              <WorkstyleTraitTag
                key={`${trait.trait}-${trait.label}`}
                label={trait.label}
                questionIndex={trait.trait}
                tagMetadata={retake.tagMetadata}
              />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

type OnboardingIntroContentProps = {
  copy: IntroCopy;
  retake: IntroRetake | null;
  introLogoRef: React.RefObject<HTMLDivElement | null>;
  introHeadingRef: React.RefObject<HTMLDivElement | null>;
  introButtonRef: React.RefObject<HTMLDivElement | null>;
  onContinue: () => void;
};

export function OnboardingIntroContent({
  copy,
  retake,
  introLogoRef,
  introHeadingRef,
  introButtonRef,
  onContinue,
}: OnboardingIntroContentProps) {
  return (
    <div
      key="intro"
      className="flex w-full max-w-210 flex-col items-center gap-10 pb-10 text-center"
    >
      <div
        ref={introLogoRef}
        style={{ opacity: 0, transform: 'translateY(30px) scale(0.8)' }}
      >
        <Image
          src="/Logo.svg"
          alt="Hireable"
          width={56}
          height={56}
          loading="eager"
          unoptimized
        />
      </div>
      <div
        ref={introHeadingRef}
        className="w-full"
        style={{ opacity: 0, transform: 'translateY(30px)' }}
      >
        <IntroHeading copy={copy} retake={retake} />
      </div>
      <div
        ref={introButtonRef}
        style={{ opacity: 0, transform: 'translateY(30px)' }}
        className="flex flex-col items-center gap-3"
      >
        <Button variant="primary" size="lg" onClick={onContinue}>
          {copy.startLabel}
        </Button>
        {retake ? (
          <Link
            href={retake.keepHref}
            className="text-muted-foreground hover:text-foreground text-sm font-medium underline-offset-4 hover:underline"
          >
            {RETAKE_KEEP_LABEL}
          </Link>
        ) : null}
      </div>
    </div>
  );
}
