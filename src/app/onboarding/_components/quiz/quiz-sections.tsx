'use client';

import { useLayoutEffect, useRef } from 'react';
import type { RefObject } from 'react';
import gsap from 'gsap';

import { InlineSpinner } from '@/web-app/components/ui/inline-spinner';
import { ProgressBar } from '@/web-app/components/ui/progress-bar';
import type { QuizCopy } from '../../_data/onboarding-copy';
import type { QuizPersona } from '../../_lib/quiz-types';
import { QuizAnswerSection } from './answer-section';
import { QuizChatThread } from './chat-thread';

function QuizHeader({
  title,
  description,
  progressCurrent,
  totalQuestions,
  currentQuestionIndex,
}: {
  title: string;
  description: string;
  progressCurrent: number;
  totalQuestions: number;
  currentQuestionIndex: number;
}) {
  // The description is one line wherever it fits, and where it can't its lines are balanced. It
  // used to wrap at 480px, a few pixels short of the line, and leave "Other." on a line of its own.
  // On a short window (`short:`) the header tightens its spacing and the progress sits on one line;
  // on a short phone, where the description would take two lines, it goes (screen readers still
  // get it; the assistant's greeting says as much). At full height the header took 151px of a
  // 720px laptop screen, and with the answer panel that left the chat 160px.
  return (
    <div
      data-onboarding-quiz-header
      className="border-border box-border flex shrink-0 flex-col items-center gap-4 border-b px-4 pt-6 pb-4 sm:gap-6 sm:pt-8 short:gap-3 short:pt-4 short:pb-3"
    >
      <div
        data-onboarding-quiz-header-copy
        className="flex w-full shrink-0 flex-col items-center gap-1 text-center"
      >
        <h1 className="text-foreground w-full shrink-0 text-base font-semibold leading-[150%] tracking-[0.2px]">
          {title}
        </h1>
        <p className="text-muted-foreground w-full shrink-0 text-sm font-normal leading-[120%] tracking-[0.2px] text-balance max-sm:short:sr-only">
          {description}
        </p>
      </div>
      <div
        data-onboarding-quiz-header-progress
        className="flex w-full max-w-120 shrink-0 flex-col items-start gap-2 sm:max-w-100 sm:flex-row sm:items-center short:flex-row short:items-center short:gap-3"
      >
        <div className="flex w-full flex-1 items-center gap-1">
          <ProgressBar
            current={progressCurrent}
            total={totalQuestions}
            ariaLabel="Quiz progress"
            className="bg-neutral-subtle h-2.5 w-full flex-1 rounded-full [&>div]:rounded-full"
          />
        </div>
        <div className="flex shrink-0 items-center justify-center gap-2.5 sm:w-26.25">
          <p className="text-muted-foreground shrink-0 text-sm font-normal leading-[120%] tracking-[0.2px]">
            Question {currentQuestionIndex + 1} of {totalQuestions}
          </p>
        </div>
      </div>
    </div>
  );
}

/** How far the closing line zooms in the middle of the screen, where there's room for it. */
const SPOTLIGHT_SCALE = 1.4;
/** Seconds the line takes to travel from the chat to the middle. */
const SPOTLIGHT_TRAVEL_S = 0.8;

/**
 * The quiz's wrap-up: the assistant's closing line lifts out of the chat and settles, zoomed, in
 * the middle of the screen while the rest of the quiz fades away, and a spinner turns after its
 * last word until the curtain comes down on the results. Without it the screen sat still for two
 * seconds after the last answer.
 *
 * It's a copy of that chat row that starts exactly over it (the row is hidden meanwhile), so the
 * line reads as one piece moving. The card is the page colour, so the chat fading out behind it
 * never shows through. Decorative: the chat log has already announced the line.
 */
function QuizFinalSpotlight({
  contentRef,
  assistantName,
  assistantAvatarSrc,
  message,
}: {
  contentRef: RefObject<HTMLDivElement | null>;
  assistantName: string;
  assistantAvatarSrc: string;
  message: string;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const lineRef = useRef<HTMLDivElement>(null);
  const spinnerRef = useRef<HTMLSpanElement>(null);
  // The spinner sits after the last word, and wraps with it rather than onto a line of its own.
  const lastSpace = message.lastIndexOf(' ');

  useLayoutEffect(() => {
    const card = cardRef.current;
    const line = lineRef.current;
    const spinner = spinnerRef.current;
    const content = contentRef.current;
    if (!card || !line || !spinner || !content) return;

    const lines = content.querySelectorAll('[data-quiz-assistant-message]');
    const row =
      lines[lines.length - 1]?.closest<HTMLElement>(
        '[data-quiz-assistant-row]',
      ) ?? null;
    const from = row?.getBoundingClientRect();
    // As wide as the row, so the line wraps exactly as it did in the chat.
    if (from) line.style.width = `${from.width}px`;
    const to = line.getBoundingClientRect();
    // Lift off from where the line can be seen: the chat may still be scrolling it into view.
    const chat = row
      ?.closest<HTMLElement>('[data-onboarding-quiz-chat]')
      ?.getBoundingClientRect();
    const fromTop =
      from && chat
        ? Math.min(Math.max(from.top, chat.top), chat.bottom - from.height)
        : (from?.top ?? 0);
    const scale = Math.max(
      1,
      Math.min(SPOTLIGHT_SCALE, (content.clientWidth - 48) / to.width),
    );

    const ctx = gsap.context(() => {
      const timeline = gsap.timeline();
      if (row && from) {
        row.style.visibility = 'hidden';
        timeline.fromTo(
          card,
          { x: from.left - to.left, y: fromTop - to.top, scale: 1 },
          {
            x: 0,
            y: 0,
            scale,
            duration: SPOTLIGHT_TRAVEL_S,
            ease: 'power3.inOut',
          },
        );
      } else {
        timeline.fromTo(
          card,
          { autoAlpha: 0, scale: scale * 0.94 },
          { autoAlpha: 1, scale, duration: 0.5, ease: 'power3.out' },
        );
      }
      // The spinner comes in as the line settles, and turns until the curtain.
      timeline.fromTo(
        spinner,
        { autoAlpha: 0, scale: 0.6 },
        { autoAlpha: 1, scale: 1, duration: 0.25, ease: 'back.out(2)' },
        '-=0.25',
      );
    });

    return () => {
      ctx.revert();
      line.style.width = '';
      if (row) row.style.visibility = '';
    };
  }, [contentRef]);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center"
    >
      <div ref={cardRef} className="bg-background rounded-2xl p-4">
        <div
          ref={lineRef}
          className="flex flex-row items-start gap-3 sm:gap-4"
        >
          <div
            className="size-9 flex-none rounded-[25px] bg-contain bg-center bg-no-repeat"
            style={{ backgroundImage: `url(${assistantAvatarSrc})` }}
          />
          <div className="flex min-w-0 flex-1 flex-col items-start gap-2">
            <p className="text-foreground text-sm font-semibold leading-[120%] tracking-[0.2px]">
              {assistantName}
            </p>
            <div className="w-full min-h-[44px]">
              <p className="text-foreground wrap-break-word w-full text-sm font-normal leading-[120%] tracking-[0.2px]">
                {message.slice(0, lastSpace + 1)}
                <span className="whitespace-nowrap">
                  {message.slice(lastSpace + 1)}
                  <span
                    ref={spinnerRef}
                    className="ml-1.5 inline-block align-[-3px]"
                    style={{ opacity: 0, visibility: 'hidden' }}
                  >
                    <InlineSpinner className="text-client size-4" />
                  </span>
                </span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

type OnboardingQuizContentProps = {
  contentRef: RefObject<HTMLDivElement | null>;
  assistantAvatarSrc: string;
  chatMessages: Parameters<typeof QuizChatThread>[0]['messages'];
  currentQuestionIndex: number;
  customReply: string;
  handleAnswerSectionExitComplete: () => void;
  handleComposerBlur: () => void;
  handleComposerFocus: () => void;
  handleComposerSend: (selectedOptionIndex: number | null) => void;
  handleCustomReplyChange: (payload: string) => void;
  handleSelectOption: (optionIndex: number | null) => void;
  hasAssistantPromptCompleted: boolean;
  hasCurrentUserResponse: boolean;
  internalSubmitting: boolean;
  isAssistantTyping: boolean;
  isComposerFocused: boolean;
  isFinalSpotlightVisible: boolean;
  isLastQuestion: boolean;
  isSubmitting: boolean;
  options: readonly string[];
  persona: QuizPersona;
  progressCurrent: number;
  questionHeadingId: string;
  quizCopy: QuizCopy;
  selectedOption: number | null;
  shouldSuppressFinalIndicators: boolean;
  totalQuestions: number;
};

export function OnboardingQuizContent(props: OnboardingQuizContentProps) {
  const {
    contentRef,
    assistantAvatarSrc,
    chatMessages,
    currentQuestionIndex,
    customReply,
    handleAnswerSectionExitComplete,
    handleComposerBlur,
    handleComposerFocus,
    handleComposerSend,
    handleCustomReplyChange,
    handleSelectOption,
    hasAssistantPromptCompleted,
    hasCurrentUserResponse,
    internalSubmitting,
    isAssistantTyping,
    isComposerFocused,
    isFinalSpotlightVisible,
    isLastQuestion,
    isSubmitting,
    options,
    persona,
    progressCurrent,
    questionHeadingId,
    quizCopy,
    selectedOption,
    shouldSuppressFinalIndicators,
    totalQuestions,
  } = props;

  // The quiz fills the window, but never shrinks below 600px: under that the page scrolls instead,
  // and the chat keeps at least 120px or so. It used to shrink with the window, so the chat went to nothing
  // and then the answer panel was cut off, the Other field first (a phone on its side).
  return (
    <div className="bg-background flex h-[calc(100dvh/var(--ui-scale))] min-h-150 w-full flex-col overflow-hidden">
      <div
        ref={contentRef}
        className="relative flex h-full min-h-0 w-full flex-col opacity-100"
      >
        <QuizHeader
          title={quizCopy.title}
          description={quizCopy.description}
          progressCurrent={progressCurrent}
          totalQuestions={totalQuestions}
          currentQuestionIndex={currentQuestionIndex}
        />
        <QuizChatThread
          messages={chatMessages}
          isAssistantTyping={
            shouldSuppressFinalIndicators ? false : isAssistantTyping
          }
          currentQuestionIndex={currentQuestionIndex}
          hasAssistantPromptCompleted={hasAssistantPromptCompleted}
          hasCurrentUserResponse={
            shouldSuppressFinalIndicators ? true : hasCurrentUserResponse
          }
          assistantName={persona.assistantName}
          assistantAvatarSrc={assistantAvatarSrc}
          questionHeadingId={questionHeadingId}
          suppressIndicators={shouldSuppressFinalIndicators}
        />
        <QuizAnswerSection
          options={options}
          selectedOption={selectedOption}
          onSelectOption={handleSelectOption}
          customReply={customReply}
          onCustomReplyChange={handleCustomReplyChange}
          onComposerFocus={handleComposerFocus}
          onComposerBlur={handleComposerBlur}
          onComposerSend={handleComposerSend}
          state={{
            composer: isComposerFocused ? 'focused' : 'idle',
            submission:
              isSubmitting || internalSubmitting ? 'submitting' : 'idle',
            question: isLastQuestion ? 'last' : 'next',
            assistantPrompt: hasAssistantPromptCompleted
              ? 'complete'
              : 'pending',
          }}
          questionHeadingId={questionHeadingId}
          currentQuestionIndex={currentQuestionIndex}
          onExitComplete={handleAnswerSectionExitComplete}
        />
        {isFinalSpotlightVisible ? (
          <QuizFinalSpotlight
            contentRef={contentRef}
            assistantName={persona.assistantName}
            assistantAvatarSrc={assistantAvatarSrc}
            message={persona.completionMessage}
          />
        ) : null}
      </div>
    </div>
  );
}
