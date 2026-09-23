'use client';

import {
  useCallback,
  useRef,
  type FocusEvent,
  type KeyboardEvent,
} from 'react';

import {
  QuizAnswerComposer,
  type QuizAnswerComposerState,
} from './answer-composer';
import { QuizAnswerOptionsList } from './answer-options-list';
import { getNextOptionIndex, isOptionSelectionKey } from './option-navigation';
import {
  useQuizAnswerEntranceAnimation,
  useQuizAnswerExitAnimation,
} from './use-answer-animations';
import { useComposerGradient } from './use-composer-gradient';
import { loadGsap, reportGsapLoadError } from '@/web-app/lib/load-gsap';
import { normalizeTextOrNull } from '../../_lib/onboarding-schemas';
import { prefersReducedMotion } from '@/web-app/lib/motion';

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

export function QuizAnswerSection({
  options,
  selectedOption,
  onSelectOption,
  customReply,
  onCustomReplyChange,
  onComposerFocus,
  onComposerBlur,
  onComposerSend,
  state,
  questionHeadingId,
  currentQuestionIndex,
  onExitComplete,
}: QuizAnswerSectionProps) {
  const answerSectionRef = useRef<HTMLDivElement>(null);
  const composerShellRef = useRef<HTMLFieldSetElement>(null);
  const composerInputRef = useRef<HTMLInputElement>(null);
  const composerSendRef = useRef<HTMLButtonElement>(null);
  const isSubmitting = state.submission === 'submitting';
  const isLastQuestion = state.question === 'last';
  const hasAssistantPromptCompleted = state.assistantPrompt === 'complete';
  const canSend =
    !isSubmitting &&
    (selectedOption !== null || normalizeTextOrNull(customReply) !== null);
  const composerState: QuizAnswerComposerState = {
    focus: state.composer,
    submission: state.submission,
    question: state.question,
    send: canSend ? 'enabled' : 'disabled',
  };

  const { start: startComposerGradient, stop: stopComposerGradient } =
    useComposerGradient(composerShellRef, currentQuestionIndex);

  useQuizAnswerEntranceAnimation(
    answerSectionRef,
    hasAssistantPromptCompleted,
    currentQuestionIndex,
  );

  const dismissComposer = useCallback(() => {
    onComposerBlur();
    stopComposerGradient();
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  }, [onComposerBlur, stopComposerGradient]);

  const handleComposerFocus = useCallback(() => {
    onComposerFocus();
    startComposerGradient();
  }, [onComposerFocus, startComposerGradient]);

  const handleComposerControlBlur = useCallback(
    (event: FocusEvent<HTMLInputElement | HTMLButtonElement>) => {
      const nextTarget = event.relatedTarget;
      if (nextTarget && composerShellRef.current?.contains(nextTarget)) {
        return;
      }

      onComposerBlur();
      stopComposerGradient();
    },
    [onComposerBlur, stopComposerGradient],
  );

  const handleComposerSendKeyDown = useCallback(
    (event: KeyboardEvent<HTMLButtonElement>) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      dismissComposer();
    },
    [dismissComposer],
  );

  const handleComposerSend = useCallback(() => {
    if (!prefersReducedMotion()) {
      void loadGsap()
        .then(({ default: loadedGsap }) => {
          if (!composerSendRef.current) return;
          loadedGsap.fromTo(
            composerSendRef.current,
            { scale: 0.94 },
            { scale: 1, duration: 0.18, ease: 'power2.out' },
          );
        })
        .catch(reportGsapLoadError);
    }

    onComposerBlur();
    stopComposerGradient();
    onComposerSend(selectedOption);
  }, [onComposerBlur, onComposerSend, selectedOption, stopComposerGradient]);

  const handleOptionSelect = useCallback(
    (optionIndex: number) => {
      onSelectOption(optionIndex);
      onComposerSend(optionIndex);
    },
    [onComposerSend, onSelectOption],
  );

  const handleOptionKeyDown = useCallback(
    (event: KeyboardEvent<HTMLButtonElement>, optionIndex: number) => {
      if (options.length === 0) return;

      if (isOptionSelectionKey(event.key)) {
        event.preventDefault();
        handleOptionSelect(optionIndex);
        return;
      }

      const nextIndex = getNextOptionIndex(
        event.key,
        optionIndex,
        options.length,
      );
      if (nextIndex === null) return;

      event.preventDefault();
      onSelectOption(nextIndex);

      answerSectionRef.current
        ?.querySelector<HTMLButtonElement>(
          `[data-quiz-option-index="${nextIndex}"]`,
        )
        ?.focus();
    },
    [handleOptionSelect, onSelectOption, options.length],
  );

  const handleComposerInputKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        dismissComposer();
        return;
      }

      if (event.key !== 'Enter' || !canSend) {
        return;
      }

      event.preventDefault();
      handleComposerSend();
    },
    [canSend, dismissComposer, handleComposerSend],
  );

  useQuizAnswerExitAnimation(
    answerSectionRef,
    isSubmitting,
    isLastQuestion,
    selectedOption,
    onExitComplete,
  );

  return (
    <div
      ref={answerSectionRef}
      data-onboarding-quiz-answer-section
      className="bg-background box-border order-2 flex w-full flex-none flex-col items-center gap-[16px] overflow-visible px-3 py-[20px] sm:px-4 sm:py-[24px]"
    >
      <div
        data-onboarding-quiz-answer-heading
        className="order-0 flex w-full max-w-[720px] flex-none flex-row items-start gap-[10px] px-0"
      >
        <h2 className="text-muted-foreground flex-none text-[14px] font-semibold uppercase leading-[120%] tracking-[0.2px]">
          Pick One
        </h2>
      </div>

      <QuizAnswerOptionsList
        options={options}
        selectedOption={selectedOption}
        currentQuestionIndex={currentQuestionIndex}
        questionHeadingId={questionHeadingId}
        hasAssistantPromptCompleted={hasAssistantPromptCompleted}
        isSubmitting={isSubmitting}
        onSelectOption={handleOptionSelect}
        onOptionKeyDown={handleOptionKeyDown}
      />

      <QuizAnswerComposer
        composerShellRef={composerShellRef}
        composerInputRef={composerInputRef}
        composerSendRef={composerSendRef}
        state={composerState}
        customReply={customReply}
        onControlBlur={handleComposerControlBlur}
        onInputChange={onCustomReplyChange}
        onInputFocus={handleComposerFocus}
        onInputKeyDown={handleComposerInputKeyDown}
        onSendKeyDown={handleComposerSendKeyDown}
        onSend={handleComposerSend}
      />
    </div>
  );
}
