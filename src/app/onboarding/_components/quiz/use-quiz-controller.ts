'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  QuizChatMessage,
  QuizPersona,
  QuizSubmissionPayload,
} from '../../_lib/quiz-types';

import { buildPromptDedupeKey, useQuizChatHistory } from './use-chat-history';
import {
  buildAssistantThread,
  buildPendingSubmission,
} from '../../_lib/quiz-thread';
import { useOnboardingAssistantThread } from './use-assistant-thread';

type UseOnboardingQuizControllerParams = {
  currentQuestionIndex: number;
  question: string;
  options: readonly string[];
  selectedOption: number | null;
  persona: QuizPersona;
  followupPrompt: string | null;
  transitionAcknowledgement: string | null;
  isLastQuestion: boolean;
  isSubmitting: boolean;
  onSubmitResponse: (payload: QuizSubmissionPayload) => Promise<void> | void;
};

type UseOnboardingQuizControllerResult = {
  chatMessages: QuizChatMessage[];
  hasCurrentUserResponse: boolean;
  hasAssistantPromptCompleted: boolean;
  customReply: string;
  isComposerFocused: boolean;
  isAssistantTyping: boolean;
  internalSubmitting: boolean;
  setCustomReply: (value: string) => void;
  setComposerFocused: (isFocused: boolean) => void;
  handleComposerSend: (selectedOptionIndex: number | null) => void;
  handleAnswerSectionExitComplete: () => void;
};

export function useOnboardingQuizController({
  currentQuestionIndex,
  question,
  options,
  selectedOption,
  persona,
  followupPrompt,
  transitionAcknowledgement,
  isLastQuestion,
  isSubmitting,
  onSubmitResponse,
}: UseOnboardingQuizControllerParams): UseOnboardingQuizControllerResult {
  // Owns transient interaction state for the active question only.
  const [customReply, setCustomReply] = useState('');
  const [isComposerFocused, setComposerFocused] = useState(false);
  const [visibleAssistantCount, setVisibleAssistantCount] = useState(0);
  const [isAssistantTyping, setAssistantTyping] = useState(false);
  const [internalSubmitting, setInternalSubmitting] = useState(false);
  const pendingSubmissionRef = useRef<QuizSubmissionPayload | null>(null);
  const hasSignedOffRef = useRef(false);

  const assistantThread = useMemo(
    () =>
      buildAssistantThread({
        currentQuestionIndex,
        followupPrompt,
        greeting: persona.greeting,
        question,
        transitionAcknowledgement,
      }),
    [
      currentQuestionIndex,
      followupPrompt,
      persona.greeting,
      question,
      transitionAcknowledgement,
    ],
  );

  const currentPromptDedupeKey = useMemo(
    () => buildPromptDedupeKey(currentQuestionIndex, assistantThread),
    [assistantThread, currentQuestionIndex],
  );
  const {
    appendMessageToChat,
    appendUserResponseToChat,
    chatMessages,
    committedAssistantMessageDedupeKeys,
    hasCurrentUserResponse,
  } = useQuizChatHistory(currentPromptDedupeKey);

  useOnboardingAssistantThread({
    assistantThread,
    appendMessageToChat,
    committedAssistantMessageDedupeKeys,
    currentPromptDedupeKey,
    currentQuestionIndex,
    isLastQuestion,
    isSubmitting,
    onAssistantTyping: setAssistantTyping,
    onMessageRevealed: setVisibleAssistantCount,
  });

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      setCustomReply('');
      setComposerFocused(false);
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [currentQuestionIndex]);

  // The answers are saved, so the assistant signs off; the wrap-up (useFinalCurtainTransition)
  // then lifts this line into the middle of the screen before the curtain. It used to sign off
  // before the last answer had even been read, so one that needed a follow-up got "you're done"
  // followed by the follow-up question.
  useEffect(() => {
    if (!isLastQuestion || !isSubmitting || hasSignedOffRef.current) return;
    hasSignedOffRef.current = true;
    appendMessageToChat('assistant', persona.completionMessage);
  }, [
    appendMessageToChat,
    isLastQuestion,
    isSubmitting,
    persona.completionMessage,
  ]);

  const handleAnswerSectionExitComplete = useCallback(() => {
    const pendingPayload = pendingSubmissionRef.current;
    if (!pendingPayload) return;

    pendingSubmissionRef.current = null;

    const finalizeSubmission = async () => {
      try {
        await onSubmitResponse(pendingPayload);
      } finally {
        setInternalSubmitting(false);
      }
    };

    void finalizeSubmission();
  }, [onSubmitResponse]);

  const handleComposerSend = useCallback(
    (preferredSelectedOptionIndex: number | null) => {
      if (internalSubmitting) return;

      const nextSubmission = buildPendingSubmission({
        preferredSelectedOptionIndex,
        selectedOption,
        options,
        customReply,
      });
      if (!nextSubmission) {
        return;
      }

      appendUserResponseToChat(nextSubmission.displayedResponseText);
      pendingSubmissionRef.current = nextSubmission.payload;
      setInternalSubmitting(true);
      setCustomReply('');
    },
    [
      appendUserResponseToChat,
      customReply,
      internalSubmitting,
      options,
      selectedOption,
      setCustomReply,
    ],
  );

  const hasAssistantPromptCompleted =
    visibleAssistantCount >= assistantThread.length && !isAssistantTyping;

  return {
    chatMessages,
    hasCurrentUserResponse,
    hasAssistantPromptCompleted,
    customReply,
    isComposerFocused,
    isAssistantTyping,
    internalSubmitting,
    setCustomReply,
    setComposerFocused,
    handleComposerSend,
    handleAnswerSectionExitComplete,
  };
}
