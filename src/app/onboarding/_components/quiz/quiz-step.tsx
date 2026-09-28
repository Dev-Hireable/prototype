'use client';

import { useCallback, useId, useMemo, useRef } from 'react';
import type { Dispatch, RefObject } from 'react';

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
  QuizPersona,
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

/**
 * The question on screen: its answers and the one picked, where it sits in the quiz, and who's
 * asking it.
 */
type QuizQuestionView = {
  quizCopy: QuizCopy;
  persona: QuizPersona;
  assistantAvatarSrc: string;
  questionHeadingId: string;
  currentQuestionIndex: number;
  totalQuestions: number;
  progressCurrent: number;
  options: readonly string[];
  selectedOption: number | null;
  isLastQuestion: boolean;
  isSubmitting: boolean;
};

/** The step's question, its answers kept per question, and the assistant as this person meets it. */
function useQuizQuestionView({
  role,
  copy: quizCopy,
  greeting,
  flowState,
  totalQuestions,
  currentQuestion,
  isLastQuestion,
}: OnboardingQuizStepProps): QuizQuestionView {
  const { currentQuestionIndex, selectedOption, isQuizSubmitting } = flowState;
  const currentAnswers = currentQuestion?.answers;
  const options = useMemo(
    () => currentAnswers?.map((answer) => answer.answerText) ?? EMPTY_OPTIONS,
    [currentAnswers],
  );
  const questionHeadingId = useId();
  const persona = useMemo(() => {
    const base = getQuizPersona(role);
    return greeting ? { ...base, greeting } : base;
  }, [greeting, role]);

  return {
    quizCopy,
    persona,
    assistantAvatarSrc: ASSISTANT_AVATAR_BY_VARIANT[role],
    questionHeadingId,
    currentQuestionIndex,
    totalQuestions,
    progressCurrent: Math.min(
      totalQuestions,
      Math.max(0, currentQuestionIndex + 1),
    ),
    options,
    selectedOption,
    isLastQuestion,
    isSubmitting: isQuizSubmitting,
  };
}

/**
 * The answer panel's handlers: picking an option clears a typed reply, and typing one clears the
 * pick.
 */
function useQuizAnswerHandlers({
  dispatchFlow,
  selectedOption,
  setCustomReply,
  setComposerFocused,
}: {
  dispatchFlow: Dispatch<WizardFlowAction>;
  selectedOption: number | null;
  setCustomReply: (value: string) => void;
  setComposerFocused: (isFocused: boolean) => void;
}) {
  const onSelectOption = useCallback(
    (index: number | null) => {
      dispatchFlow({ type: 'setSelectedOption', option: index });
    },
    [dispatchFlow],
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

  return {
    handleSelectOption,
    handleCustomReplyChange,
    handleComposerFocus,
    handleComposerBlur,
  };
}

/**
 * The conversation about the question (useOnboardingQuizController), and the answer panel's
 * handlers on it.
 */
function useQuizConversation(
  {
    flowState,
    dispatchFlow,
    currentQuestion,
    handleQuizSubmitResponse: onSubmitResponse,
  }: OnboardingQuizStepProps,
  question: QuizQuestionView,
) {
  const { setCustomReply, setComposerFocused, ...conversation } =
    useOnboardingQuizController({
      currentQuestionIndex: question.currentQuestionIndex,
      question: currentQuestion?.questionText ?? '',
      options: question.options,
      selectedOption: question.selectedOption,
      persona: question.persona,
      followupPrompt: flowState.pendingFollowup?.prompt ?? null,
      transitionAcknowledgement: flowState.lastAssistantAcknowledgement,
      isLastQuestion: question.isLastQuestion,
      isSubmitting: question.isSubmitting,
      onSubmitResponse,
    });
  const answerHandlers = useQuizAnswerHandlers({
    dispatchFlow,
    selectedOption: question.selectedOption,
    setCustomReply,
    setComposerFocused,
  });

  return { ...conversation, ...answerHandlers };
}

/**
 * Everything the quiz screen shows and does (OnboardingQuizContent): the question, the
 * conversation about it, and the wrap-up after the last answer. Also plays the header and chat's
 * entrance, and their exit for the wrap-up.
 */
function useOnboardingQuizStep(
  props: OnboardingQuizStepProps,
  contentRef: RefObject<HTMLDivElement | null>,
) {
  const question = useQuizQuestionView(props);
  const conversation = useQuizConversation(props, question);
  const wrapUp = useFinalCurtainTransition({
    isLastQuestion: props.isLastQuestion,
    isSubmitting: props.flowState.isQuizSubmitting,
    internalSubmitting: conversation.internalSubmitting,
    onFinalTransitionComplete: props.handleQuizFinalTransitionComplete,
  });

  useQuizSectionAnimations(
    contentRef,
    props.isLastQuestion,
    wrapUp.isFinalSpotlightVisible,
  );

  return { ...question, ...conversation, ...wrapUp };
}

export function OnboardingQuizStep(props: OnboardingQuizStepProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const quiz = useOnboardingQuizStep(props, contentRef);

  return (
    <OnboardingStepShell hideHeader hideProgress>
      <OnboardingQuizContent contentRef={contentRef} {...quiz} />
    </OnboardingStepShell>
  );
}
