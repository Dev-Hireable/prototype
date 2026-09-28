'use client';

import { useEffect, useLayoutEffect } from 'react';

import {
  buildAssistantMessageDedupeKey,
  commitDedupeKeyOnce,
} from './use-chat-history';

const ASSISTANT_TYPING_DURATIONS = [620, 560, 760] as const;
const ASSISTANT_MESSAGE_GAP_MS = 180;

type UseOnboardingAssistantThreadParams = {
  assistantThread: string[];
  appendMessageToChat: (sender: 'assistant' | 'user', text: string) => void;
  committedAssistantMessageDedupeKeys: Set<string>;
  currentPromptDedupeKey: string;
  currentQuestionIndex: number;
  isLastQuestion: boolean;
  isSubmitting: boolean;
  onAssistantTyping: (isTyping: boolean) => void;
  onMessageRevealed: (visibleCount: number) => void;
};

/** What revealing the assistant's lines needs: the lines, and where each goes as it's said. */
type AssistantThreadReveal = Omit<
  UseOnboardingAssistantThreadParams,
  'currentQuestionIndex' | 'isLastQuestion' | 'isSubmitting'
>;

/**
 * Adds the thread's line at `index` to the chat, unless it's already there: a reveal that starts
 * over (its effect running again) doesn't say a line twice.
 */
function appendThreadLineOnce(reveal: AssistantThreadReveal, index: number) {
  const assistantMessage = reveal.assistantThread[index];
  const assistantMessageDedupeKey = buildAssistantMessageDedupeKey(
    reveal.currentPromptDedupeKey,
    index,
  );
  if (
    assistantMessage &&
    commitDedupeKeyOnce(
      reveal.committedAssistantMessageDedupeKeys,
      assistantMessageDedupeKey,
    )
  ) {
    reveal.appendMessageToChat('assistant', assistantMessage);
  }
}

/**
 * Says the assistant's lines one at a time, from the next frame: typing dots for a moment (a
 * little longer for later lines), the line, then a short pause before the next. Returns the
 * cancel that stops it where it is.
 */
function startThreadReveal(reveal: AssistantThreadReveal): () => void {
  const { assistantThread, onAssistantTyping, onMessageRevealed } = reveal;
  let frameId: ReturnType<typeof window.requestAnimationFrame> | null = null;
  let timeoutId: number | null = null;
  let cancelled = false;

  const revealNextMessage = (index: number) => {
    if (cancelled || index >= assistantThread.length) {
      onAssistantTyping(false);
      return;
    }

    const typingDuration =
      ASSISTANT_TYPING_DURATIONS[
        Math.min(index, ASSISTANT_TYPING_DURATIONS.length - 1)
      ];

    onAssistantTyping(true);
    timeoutId = window.setTimeout(() => {
      if (cancelled) return;

      appendThreadLineOnce(reveal, index);

      onMessageRevealed(index + 1);
      onAssistantTyping(false);

      if (index + 1 >= assistantThread.length) {
        return;
      }

      timeoutId = window.setTimeout(() => {
        revealNextMessage(index + 1);
      }, ASSISTANT_MESSAGE_GAP_MS);
    }, typingDuration);
  };

  frameId = window.requestAnimationFrame(() => {
    if (cancelled) return;
    onMessageRevealed(0);
    revealNextMessage(0);
  });

  return () => {
    cancelled = true;
    if (frameId !== null) {
      window.cancelAnimationFrame(frameId);
    }
    if (timeoutId !== null) {
      window.clearTimeout(timeoutId);
    }
  };
}

export function useOnboardingAssistantThread({
  assistantThread,
  appendMessageToChat,
  committedAssistantMessageDedupeKeys,
  currentPromptDedupeKey,
  currentQuestionIndex,
  isLastQuestion,
  isSubmitting,
  onAssistantTyping,
  onMessageRevealed,
}: UseOnboardingAssistantThreadParams) {
  useLayoutEffect(() => {
    onMessageRevealed(0);
    onAssistantTyping(false);
  }, [currentQuestionIndex, onAssistantTyping, onMessageRevealed]);

  useEffect(() => {
    if (isLastQuestion && isSubmitting) {
      onAssistantTyping(false);
      return;
    }

    return startThreadReveal({
      assistantThread,
      appendMessageToChat,
      committedAssistantMessageDedupeKeys,
      currentPromptDedupeKey,
      onAssistantTyping,
      onMessageRevealed,
    });
  }, [
    assistantThread,
    appendMessageToChat,
    committedAssistantMessageDedupeKeys,
    currentPromptDedupeKey,
    currentQuestionIndex,
    isLastQuestion,
    isSubmitting,
    onAssistantTyping,
    onMessageRevealed,
  ]);
}
