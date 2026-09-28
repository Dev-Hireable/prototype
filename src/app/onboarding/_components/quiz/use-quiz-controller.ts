'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { RefObject } from 'react';
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

type ChatHistory = ReturnType<typeof useQuizChatHistory>;

/**
 * What the assistant says for this question, and the key that marks those lines as one prompt in
 * the chat history.
 */
function useAssistantPrompt({
  currentQuestionIndex,
  question,
  persona,
  followupPrompt,
  transitionAcknowledgement,
}: Pick<
  UseOnboardingQuizControllerParams,
  | 'currentQuestionIndex'
  | 'question'
  | 'persona'
  | 'followupPrompt'
  | 'transitionAcknowledgement'
>) {
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

  return { assistantThread, currentPromptDedupeKey };
}

/**
 * Reveals the assistant's lines into the chat one by one, with typing dots between them
 * (useOnboardingAssistantThread). The prompt is complete once every line is out and the dots
 * are gone.
 */
function useAssistantReveal({
  assistantThread,
  currentPromptDedupeKey,
  history,
  currentQuestionIndex,
  isLastQuestion,
  isSubmitting,
}: {
  assistantThread: string[];
  currentPromptDedupeKey: string;
  history: ChatHistory;
  currentQuestionIndex: number;
  isLastQuestion: boolean;
  isSubmitting: boolean;
}) {
  const [visibleAssistantCount, setVisibleAssistantCount] = useState(0);
  const [isAssistantTyping, setAssistantTyping] = useState(false);

  useOnboardingAssistantThread({
    assistantThread,
    appendMessageToChat: history.appendMessageToChat,
    committedAssistantMessageDedupeKeys:
      history.committedAssistantMessageDedupeKeys,
    currentPromptDedupeKey,
    currentQuestionIndex,
    isLastQuestion,
    isSubmitting,
    onAssistantTyping: setAssistantTyping,
    onMessageRevealed: setVisibleAssistantCount,
  });

  return {
    isAssistantTyping,
    hasAssistantPromptCompleted:
      visibleAssistantCount >= assistantThread.length && !isAssistantTyping,
  };
}

/** The Other reply being written and whether its field has focus; both reset for each question. */
function useComposerState(currentQuestionIndex: number) {
  const [customReply, setCustomReply] = useState('');
  const [isComposerFocused, setComposerFocused] = useState(false);

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      setCustomReply('');
      setComposerFocused(false);
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [currentQuestionIndex]);

  return { customReply, setCustomReply, isComposerFocused, setComposerFocused };
}

/** The assistant's closing line, said once, after the last question's answers are saved. */
function useAssistantSignOff({
  appendMessageToChat,
  persona,
  isLastQuestion,
  isSubmitting,
}: {
  appendMessageToChat: ChatHistory['appendMessageToChat'];
  persona: QuizPersona;
  isLastQuestion: boolean;
  isSubmitting: boolean;
}) {
  const hasSignedOffRef = useRef(false);

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
}

/**
 * Hands the answer held through the answer panel's exit to the quiz, and ends the submitting
 * state once the quiz has taken it.
 */
function submitHeldAnswer(
  pendingSubmissionRef: RefObject<QuizSubmissionPayload | null>,
  onSubmitResponse: UseOnboardingQuizControllerParams['onSubmitResponse'],
  setInternalSubmitting: (isSubmitting: boolean) => void,
) {
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
}

type AnswerSubmissionParams = Pick<
  UseOnboardingQuizControllerParams,
  'options' | 'selectedOption' | 'onSubmitResponse'
> & {
  customReply: string;
  setCustomReply: (value: string) => void;
  appendUserResponseToChat: ChatHistory['appendUserResponseToChat'];
};

/**
 * Sending an answer: it shows in the chat at once and is held while the answer panel plays its
 * exit, then goes to the quiz (handleAnswerSectionExitComplete).
 */
function useAnswerSubmission({
  options,
  selectedOption,
  customReply,
  setCustomReply,
  appendUserResponseToChat,
  onSubmitResponse,
}: AnswerSubmissionParams) {
  const [internalSubmitting, setInternalSubmitting] = useState(false);
  const pendingSubmissionRef = useRef<QuizSubmissionPayload | null>(null);

  const handleAnswerSectionExitComplete = useCallback(() => {
    submitHeldAnswer(
      pendingSubmissionRef,
      onSubmitResponse,
      setInternalSubmitting,
    );
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

  return {
    internalSubmitting,
    handleAnswerSectionExitComplete,
    handleComposerSend,
  };
}

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
  const { assistantThread, currentPromptDedupeKey } = useAssistantPrompt({
    currentQuestionIndex,
    question,
    persona,
    followupPrompt,
    transitionAcknowledgement,
  });
  const history = useQuizChatHistory(currentPromptDedupeKey);
  const reveal = useAssistantReveal({
    assistantThread,
    currentPromptDedupeKey,
    history,
    currentQuestionIndex,
    isLastQuestion,
    isSubmitting,
  });
  const composer = useComposerState(currentQuestionIndex);

  useAssistantSignOff({
    appendMessageToChat: history.appendMessageToChat,
    persona,
    isLastQuestion,
    isSubmitting,
  });

  const submission = useAnswerSubmission({
    options,
    selectedOption,
    customReply: composer.customReply,
    setCustomReply: composer.setCustomReply,
    appendUserResponseToChat: history.appendUserResponseToChat,
    onSubmitResponse,
  });

  return {
    chatMessages: history.chatMessages,
    hasCurrentUserResponse: history.hasCurrentUserResponse,
    ...reveal,
    ...composer,
    ...submission,
  };
}
