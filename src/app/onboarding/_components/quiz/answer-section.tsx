'use client';

import { useRef, type RefObject } from 'react';

import {
  QuizAnswerComposer,
  type QuizAnswerComposerState,
} from './answer-composer';
import { QuizAnswerOptionsList } from './answer-options-list';
import {
  useQuizAnswerEntranceAnimation,
  useQuizAnswerExitAnimation,
} from './use-answer-animations';
import { useComposerHandlers, useOptionHandlers } from './use-answer-handlers';
import { normalizeTextOrNull } from '../../_lib/onboarding-schemas';

type QuizAnswerSectionProps = {
  options: readonly string[];
  selectedOption: number | null;
  onSelectOption: (index: number) => void;
  customReply: string;
  onCustomReplyChange: (reply: string) => void;
  onComposerFocus: () => void;
  onComposerBlur: () => void;
  onComposerSend: (selectedOptionIndex: number | null) => void;
  state: QuizAnswerSectionState;
  questionHeadingId: string;
  currentQuestionIndex: number;
  onExitComplete: () => void;
};

type QuizAnswerSectionState = {
  composer: 'focused' | 'idle';
  submission: 'idle' | 'submitting';
  question: 'next' | 'last';
  assistantPrompt: 'pending' | 'complete';
};

/**
 * Where the answer section stands: whether it's sending, on the last question, ready for an
 * answer, and able to send one.
 */
function answerSectionStatus(
  state: QuizAnswerSectionState,
  selectedOption: number | null,
  customReply: string,
) {
  const isSubmitting = state.submission === 'submitting';
  const canSend =
    !isSubmitting &&
    (selectedOption !== null || normalizeTextOrNull(customReply) !== null);
  const composerState: QuizAnswerComposerState = {
    focus: state.composer,
    submission: state.submission,
    question: state.question,
    send: canSend ? 'enabled' : 'disabled',
  };

  return {
    isSubmitting,
    isLastQuestion: state.question === 'last',
    hasAssistantPromptCompleted: state.assistantPrompt === 'complete',
    canSend,
    composerState,
  };
}

/**
 * The answer section's behaviour: its entrance once the assistant has asked, its exit as an answer
 * goes, and the composer's and the options' handlers.
 */
function useQuizAnswerSection(
  {
    options,
    selectedOption,
    onSelectOption,
    customReply,
    onComposerFocus,
    onComposerBlur,
    onComposerSend,
    state,
    currentQuestionIndex,
    onExitComplete,
  }: QuizAnswerSectionProps,
  answerSectionRef: RefObject<HTMLDivElement | null>,
) {
  const status = answerSectionStatus(state, selectedOption, customReply);

  const composer = useComposerHandlers({
    currentQuestionIndex,
    selectedOption,
    canSend: status.canSend,
    onComposerFocus,
    onComposerBlur,
    onComposerSend,
  });

  useQuizAnswerEntranceAnimation(
    answerSectionRef,
    status.hasAssistantPromptCompleted,
    currentQuestionIndex,
  );

  const optionHandlers = useOptionHandlers({
    answerSectionRef,
    options,
    onSelectOption,
    onComposerSend,
  });

  useQuizAnswerExitAnimation(
    answerSectionRef,
    status.isSubmitting,
    status.isLastQuestion,
    selectedOption,
    onExitComplete,
  );

  return { ...status, ...composer, ...optionHandlers };
}

/** The panel's heading, over the options. */
function AnswerHeading() {
  return (
    <div
      data-onboarding-quiz-answer-heading
      className="order-0 flex w-full max-w-[720px] flex-none flex-row items-start gap-[10px] px-0"
    >
      <h2 className="text-muted-foreground flex-none text-[14px] font-semibold uppercase leading-[120%] tracking-[0.2px]">
        Pick One
      </h2>
    </div>
  );
}

export function QuizAnswerSection(props: QuizAnswerSectionProps) {
  const {
    options,
    selectedOption,
    customReply,
    onCustomReplyChange,
    questionHeadingId,
    currentQuestionIndex,
  } = props;
  const answerSectionRef = useRef<HTMLDivElement>(null);
  const composerInputRef = useRef<HTMLInputElement>(null);
  const answer = useQuizAnswerSection(props, answerSectionRef);

  return (
    <div
      ref={answerSectionRef}
      data-onboarding-quiz-answer-section
      // Tighter on a short window (`short:`), where every pixel it takes is one the chat above loses.
      className="bg-background box-border order-2 flex w-full flex-none flex-col items-center gap-[16px] overflow-visible px-3 py-[20px] sm:px-4 sm:py-[24px] short:gap-3 short:py-3"
    >
      <AnswerHeading />

      <QuizAnswerOptionsList
        options={options}
        selectedOption={selectedOption}
        currentQuestionIndex={currentQuestionIndex}
        questionHeadingId={questionHeadingId}
        hasAssistantPromptCompleted={answer.hasAssistantPromptCompleted}
        isSubmitting={answer.isSubmitting}
        onSelectOption={answer.handleOptionSelect}
        onOptionKeyDown={answer.handleOptionKeyDown}
      />

      <QuizAnswerComposer
        composerShellRef={answer.composerShellRef}
        composerInputRef={composerInputRef}
        composerSendRef={answer.composerSendRef}
        state={answer.composerState}
        customReply={customReply}
        onControlBlur={answer.handleComposerControlBlur}
        onInputChange={onCustomReplyChange}
        onInputFocus={answer.handleComposerFocus}
        onInputKeyDown={answer.handleComposerInputKeyDown}
        onSendKeyDown={answer.handleComposerSendKeyDown}
        onSend={answer.handleComposerSend}
      />
    </div>
  );
}
