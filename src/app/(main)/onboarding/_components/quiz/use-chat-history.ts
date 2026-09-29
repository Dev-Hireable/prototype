'use client';

import { useCallback, useRef, useState } from 'react';
import type { QuizChatMessage } from '../../_lib/quiz-types';

import { normalizeTextOrNull } from '../../_lib/onboarding-schemas';

const DEDUPE_KEY_SEPARATOR = '\u241f';

export function commitDedupeKeyOnce(
  dedupeKeys: Set<string>,
  dedupeKey: string,
): boolean {
  if (dedupeKeys.has(dedupeKey)) return false;
  dedupeKeys.add(dedupeKey);
  return true;
}

export function buildPromptDedupeKey(
  questionIndex: number,
  lines: string[],
): string {
  const normalizedLines: string[] = [];
  for (const line of lines) {
    const normalizedLine = normalizeTextOrNull(line);
    if (normalizedLine !== null) {
      normalizedLines.push(normalizedLine);
    }
  }
  return `${questionIndex}::${normalizedLines.join(DEDUPE_KEY_SEPARATOR)}`;
}

export function buildAssistantMessageDedupeKey(
  promptDedupeKey: string,
  messageIndex: number,
): string {
  return `${promptDedupeKey}::${messageIndex}`;
}

export function useQuizChatHistory(currentPromptDedupeKey: string) {
  const [chatMessages, setChatMessages] = useState<QuizChatMessage[]>([]);
  const [lastCommittedPromptDedupeKey, setLastCommittedPromptDedupeKey] =
    useState<string | null>(null);
  const historyMessageIdRef = useRef(0);
  const [committedAssistantMessageDedupeKeys] = useState(
    () => new Set<string>(),
  );

  const appendMessageToChat = useCallback(
    (sender: QuizChatMessage['sender'], text: string) => {
      const normalizedText = normalizeTextOrNull(text);
      if (normalizedText === null) return;

      // Allocate the id before queueing: React may invoke a state updater more
      // than once, and bumping the ref inside it would skew ids and hand the
      // same message a different key across replays.
      historyMessageIdRef.current += 1;
      const id = `chat-${historyMessageIdRef.current}`;

      setChatMessages((previous) => [
        ...previous,
        { id, sender, text: normalizedText },
      ]);
    },
    [],
  );

  const appendUserResponseToChat = useCallback(
    (responseText: string) => {
      const normalizedResponse = normalizeTextOrNull(responseText);
      if (normalizedResponse === null) return;

      setLastCommittedPromptDedupeKey(currentPromptDedupeKey);
      appendMessageToChat('user', normalizedResponse);
    },
    [appendMessageToChat, currentPromptDedupeKey],
  );

  return {
    appendMessageToChat,
    appendUserResponseToChat,
    chatMessages,
    committedAssistantMessageDedupeKeys,
    hasCurrentUserResponse:
      lastCommittedPromptDedupeKey === currentPromptDedupeKey,
  };
}
