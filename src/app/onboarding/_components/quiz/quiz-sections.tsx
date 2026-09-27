'use client';

import type { RefObject } from 'react';

import { InlineSpinner } from '@/web-app/components/ui/inline-spinner';
import { ProgressBar } from '@/web-app/components/ui/progress-bar';
import type { QuizCopy } from '../../_data/onboarding-copy';
import type { QuizPersona } from '../../_lib/quiz-types';
import { QuizAnswerSection } from './answer-section';
import { QuizChatThread } from './chat-thread';
import { useSpotlightFlight } from './use-spotlight-flight';

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
  const { cardRef, lineRef, spinnerRef } = useSpotlightFlight(contentRef);
  // The spinner sits after the last word, and wraps with it rather than onto a line of its own.
  const lastSpace = message.lastIndexOf(' ');

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

/** What the quiz screen shows and does: everything OnboardingQuizContent takes but its ref. */
type QuizContentView = Omit<OnboardingQuizContentProps, 'contentRef'>;

/** The conversation, its typing and pending indicators held back once the wrap-up starts. */
function QuizChat({ quiz }: { quiz: QuizContentView }) {
  const { shouldSuppressFinalIndicators } = quiz;

  return (
    <QuizChatThread
      messages={quiz.chatMessages}
      isAssistantTyping={
        shouldSuppressFinalIndicators ? false : quiz.isAssistantTyping
      }
      currentQuestionIndex={quiz.currentQuestionIndex}
      hasAssistantPromptCompleted={quiz.hasAssistantPromptCompleted}
      hasCurrentUserResponse={
        shouldSuppressFinalIndicators ? true : quiz.hasCurrentUserResponse
      }
      assistantName={quiz.persona.assistantName}
      assistantAvatarSrc={quiz.assistantAvatarSrc}
      questionHeadingId={quiz.questionHeadingId}
      suppressIndicators={shouldSuppressFinalIndicators}
    />
  );
}

/** The answer panel: the options, the Other reply, and where the question and its answer stand. */
function QuizAnswers({ quiz }: { quiz: QuizContentView }) {
  return (
    <QuizAnswerSection
      options={quiz.options}
      selectedOption={quiz.selectedOption}
      onSelectOption={quiz.handleSelectOption}
      customReply={quiz.customReply}
      onCustomReplyChange={quiz.handleCustomReplyChange}
      onComposerFocus={quiz.handleComposerFocus}
      onComposerBlur={quiz.handleComposerBlur}
      onComposerSend={quiz.handleComposerSend}
      state={{
        composer: quiz.isComposerFocused ? 'focused' : 'idle',
        submission:
          quiz.isSubmitting || quiz.internalSubmitting ? 'submitting' : 'idle',
        question: quiz.isLastQuestion ? 'last' : 'next',
        assistantPrompt: quiz.hasAssistantPromptCompleted
          ? 'complete'
          : 'pending',
      }}
      questionHeadingId={quiz.questionHeadingId}
      currentQuestionIndex={quiz.currentQuestionIndex}
      onExitComplete={quiz.handleAnswerSectionExitComplete}
    />
  );
}

export function OnboardingQuizContent({
  contentRef,
  ...quiz
}: OnboardingQuizContentProps) {
  const { quizCopy, persona, assistantAvatarSrc } = quiz;

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
          progressCurrent={quiz.progressCurrent}
          totalQuestions={quiz.totalQuestions}
          currentQuestionIndex={quiz.currentQuestionIndex}
        />
        <QuizChat quiz={quiz} />
        <QuizAnswers quiz={quiz} />
        {quiz.isFinalSpotlightVisible ? (
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
