'use client';

import { useCallback, useId, useMemo, useRef } from 'react';
import type { Dispatch } from 'react';

import { OnboardingStepShell } from '../shared/step-shell';
import { getQuizPersona } from '../../_lib/quiz-conversation-spec';
import { normalizeTextOrNull } from '../../_lib/onboarding-schemas';
import { useOnboardingQuizController } from './use-quiz-controller';
import { useFinalCurtainTransition } from './use-curtain-transition';
import { useQuizSectionAnimations } from './use-section-animations';
import { OnboardingQuizContent } from './quiz-sections';
import type { PublicSignupRole } from '@/web-app/lib/auth/auth-role-mapping';
import type { QuizCopy } from '../../_data/onboarding-copy';
import type {
  QuizQuestionWithAnswers,
  QuizSubmissionPayload,
} from '../../_lib/quiz-types';
import type {
  WizardFlowState,
  WizardFlowAction,
} from '../../_lib/onboarding-wizard-flow';

const ASSISTANT_AVATAR_BY_VARIANT = {
  client: '/images/employer-success.svg',
  talent: '/images/talent-success.svg',
} as const;

const EMPTY_OPTIONS: readonly string[] = [];

type OnboardingQuizStepProps = {
  role: PublicSignupRole;
  copy: QuizCopy;
  /** Replaces the assistant's introduction, for someone it has already met (a retake). */
  greeting: string | null;
  flowState: WizardFlowState;
  dispatchFlow: Dispatch<WizardFlowAction>;
  totalQuestions: number;
  currentQuestion: QuizQuestionWithAnswers | null;
  isLastQuestion: boolean;
  handleQuizSubmitResponse: (payload: QuizSubmissionPayload) => Promise<void>;
  handleQuizFinalTransitionComplete: () => void;
};

export function OnboardingQuizStep({
  role,
  copy: quizCopy,
  greeting,
  flowState,
  dispatchFlow,
  totalQuestions,
  currentQuestion,
  isLastQuestion,
  handleQuizSubmitResponse: onSubmitResponse,
  handleQuizFinalTransitionComplete: onFinalTransitionComplete,
}: OnboardingQuizStepProps) {
  const {
    currentQuestionIndex,
    selectedOption,
    pendingFollowup,
    lastAssistantAcknowledgement: transitionAcknowledgement,
    isQuizSubmitting,
  } = flowState;
  const followupPrompt = pendingFollowup?.prompt ?? null;
  const question = currentQuestion?.questionText ?? '';
  const currentAnswers = currentQuestion?.answers;
  const options = useMemo(
    () => currentAnswers?.map((answer) => answer.answerText) ?? EMPTY_OPTIONS,
    [currentAnswers],
  );
  const onSelectOption = useCallback(
    (index: number | null) => {
      dispatchFlow({ type: 'setSelectedOption', option: index });
    },
    [dispatchFlow],
  );
  const questionHeadingId = useId();
  const assistantAvatarSrc = ASSISTANT_AVATAR_BY_VARIANT[role];
  const persona = useMemo(() => {
    const base = getQuizPersona(role);
    return greeting ? { ...base, greeting } : base;
  }, [greeting, role]);
  const {
    chatMessages,
    hasCurrentUserResponse,
    hasAssistantPromptCompleted,
    customReply,
    isComposerFocused,
    isAssistantTyping,
    internalSubmitting,
    setCustomReply,
    setComposerFocused,
    handleAnswerSectionExitComplete,
    handleComposerSend,
  } = useOnboardingQuizController({
    currentQuestionIndex,
    question,
    options,
    selectedOption,
    persona,
    followupPrompt,
    transitionAcknowledgement,
    isLastQuestion,
    isSubmitting: isQuizSubmitting,
    onSubmitResponse,
  });
  const progressCurrent = Math.min(
    totalQuestions,
    Math.max(0, currentQuestionIndex + 1),
  );
  const handleSelectOption = useCallback(
    (optionIndex: number | null) => {
      setCustomReply('');
      onSelectOption(optionIndex);
    },
    [onSelectOption, setCustomReply],
  );
  const handleCustomReplyChange = useCallback(
    (payload: string) => {
      setCustomReply(payload);
      if (normalizeTextOrNull(payload) !== null && selectedOption !== null) {
        onSelectOption(null);
      }
    },
    [onSelectOption, selectedOption, setCustomReply],
  );
  const handleComposerFocus = useCallback(() => {
    setComposerFocused(true);
  }, [setComposerFocused]);
  const handleComposerBlur = useCallback(() => {
    setComposerFocused(false);
  }, [setComposerFocused]);
  const contentRef = useRef<HTMLDivElement>(null);

  const { isFinalSpotlightVisible, shouldSuppressFinalIndicators } =
    useFinalCurtainTransition({
      isLastQuestion,
      isSubmitting: isQuizSubmitting,
      internalSubmitting,
      onFinalTransitionComplete,
    });

  useQuizSectionAnimations(contentRef, isLastQuestion, isFinalSpotlightVisible);

  return (
    <OnboardingStepShell hideHeader hideProgress>
      <OnboardingQuizContent
        contentRef={contentRef}
        assistantAvatarSrc={assistantAvatarSrc}
        chatMessages={chatMessages}
        currentQuestionIndex={currentQuestionIndex}
        customReply={customReply}
        handleAnswerSectionExitComplete={handleAnswerSectionExitComplete}
        handleComposerBlur={handleComposerBlur}
        handleComposerFocus={handleComposerFocus}
        handleComposerSend={handleComposerSend}
        handleCustomReplyChange={handleCustomReplyChange}
        handleSelectOption={handleSelectOption}
        hasAssistantPromptCompleted={hasAssistantPromptCompleted}
        hasCurrentUserResponse={hasCurrentUserResponse}
        internalSubmitting={internalSubmitting}
        isAssistantTyping={isAssistantTyping}
        isComposerFocused={isComposerFocused}
        isFinalSpotlightVisible={isFinalSpotlightVisible}
        isLastQuestion={isLastQuestion}
        isSubmitting={isQuizSubmitting}
        options={options}
        persona={persona}
        progressCurrent={progressCurrent}
        questionHeadingId={questionHeadingId}
        quizCopy={quizCopy}
        selectedOption={selectedOption}
        shouldSuppressFinalIndicators={shouldSuppressFinalIndicators}
        totalQuestions={totalQuestions}
      />
    </OnboardingStepShell>
  );
}
