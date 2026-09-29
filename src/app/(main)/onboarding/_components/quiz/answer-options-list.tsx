'use client';

import { useCallback, type KeyboardEvent, type MouseEvent } from 'react';

import { cn } from '@/web-app/lib/utils';
import { OptionButton } from './option-button';

type QuizAnswerOptionsListProps = {
  options: readonly string[];
  selectedOption: number | null;
  currentQuestionIndex: number;
  questionHeadingId: string;
  hasAssistantPromptCompleted: boolean;
  isSubmitting: boolean;
  onSelectOption: (optionIndex: number) => void;
  onOptionKeyDown: (
    event: KeyboardEvent<HTMLButtonElement>,
    optionIndex: number,
  ) => void;
};

/**
 * The radiogroup's single tab stop: the picked option, or the first one while none is picked.
 * Arrows move between the rest (QuizAnswerSection's option keys).
 */
function optionTabIndex(selectedOption: number | null, choiceIndex: number) {
  return selectedOption === null
    ? choiceIndex === 0
      ? 0
      : -1
    : selectedOption === choiceIndex
      ? 0
      : -1;
}

export function QuizAnswerOptionsList({
  options,
  selectedOption,
  currentQuestionIndex,
  questionHeadingId,
  hasAssistantPromptCompleted,
  isSubmitting,
  onSelectOption,
  onOptionKeyDown,
}: QuizAnswerOptionsListProps) {
  const handleOptionClick = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      const index = Number(event.currentTarget.dataset.quizOptionIndex);
      onSelectOption(index);
    },
    [onSelectOption],
  );

  const handleOptionKeyDown = useCallback(
    (event: KeyboardEvent<HTMLButtonElement>) => {
      const index = Number(event.currentTarget.dataset.quizOptionIndex);
      onOptionKeyDown(event, index);
    },
    [onOptionKeyDown],
  );

  return (
    <div
      data-onboarding-quiz-options
      role="radiogroup"
      aria-labelledby={questionHeadingId}
      className={cn(
        'order-1 -m-1 flex w-[calc(100%+8px)] max-w-[calc(720px+8px)] min-h-0 flex-none flex-col items-start gap-[8px] p-1 sm:-m-2 sm:w-[calc(100%+16px)] sm:max-w-[calc(720px+16px)] sm:p-2',
        hasAssistantPromptCompleted
          ? 'visible pointer-events-auto opacity-100'
          : 'invisible pointer-events-none opacity-0',
      )}
    >
      {options.map((choice, choiceIndex) => (
        <OptionButton
          key={`${currentQuestionIndex}-${choiceIndex}`}
          label={choice}
          selected={selectedOption === choiceIndex}
          onClick={handleOptionClick}
          disabled={isSubmitting}
          optionIndex={choiceIndex}
          tabIndex={optionTabIndex(selectedOption, choiceIndex)}
          data-quiz-option-index={choiceIndex}
          onKeyDown={handleOptionKeyDown}
        />
      ))}
    </div>
  );
}
