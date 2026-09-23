'use client';

import { useCallback, useEffect, useMemo, useRef, type RefObject } from 'react';

import {
  AssistantChatRow,
  AssistantTypingRow,
  type AnimateBubbleIn,
  type BubbleAnimationStyle,
  UserChatRow,
  UserPendingRow,
} from './chat-thread-rows';
import type { QuizChatMessage } from '../../_lib/quiz-types';
import { loadGsap, reportGsapLoadError } from '@/web-app/lib/load-gsap';
import { prefersReducedMotion } from '@/web-app/lib/motion';

type QuizChatThreadProps = {
  messages: QuizChatMessage[];
  isAssistantTyping: boolean;
  currentQuestionIndex: number;
  hasAssistantPromptCompleted: boolean;
  hasCurrentUserResponse: boolean;
  assistantName: string;
  assistantAvatarSrc: string;
  questionHeadingId?: string;
  suppressIndicators?: boolean;
};

function useChatBubbleEntranceAnimation(): AnimateBubbleIn {
  return useCallback(
    (element: HTMLElement | null, style: BubbleAnimationStyle) => {
      if (!element || element.dataset.gsapAnimated === 'true') return;
      element.dataset.gsapAnimated = 'true';

      if (prefersReducedMotion()) {
        element.style.opacity = '1';
        return;
      }

      element.style.opacity = '0';

      void loadGsap()
        .then(({ default: gsap }) => {
          if (!element) return;

          const isUser = style === 'user';
          const isTyping = style === 'typing';
          gsap.set(element, {
            transformOrigin: isUser ? 'right bottom' : 'left bottom',
            willChange: 'opacity, transform',
          });

          if (isTyping) {
            gsap.fromTo(
              element,
              {
                autoAlpha: 0,
                y: 4,
                scale: 0.96,
              },
              {
                autoAlpha: 1,
                y: 0,
                scale: 1,
                duration: 0.2,
                ease: 'power2.out',
                clearProps: 'willChange, transform',
              },
            );
            return;
          }

          const timeline = gsap.timeline({
            onComplete: () => {
              gsap.set(element, { clearProps: 'willChange, transform' });
            },
          });
          timeline.fromTo(
            element,
            {
              autoAlpha: 0,
              y: 8,
              scale: 0.96,
            },
            {
              autoAlpha: 1,
              y: 0,
              scale: 1,
              duration: 0.3,
              ease: 'power2.out',
            },
          );
        })
        .catch((error: unknown) => {
          reportGsapLoadError(error);
          element.style.opacity = '1';
          element.style.transform = 'none';
        });
    },
    [],
  );
}

type UseChatIndicatorsAnimationParams = {
  chatScrollRef: RefObject<HTMLDivElement | null>;
  messagesLength: number;
  currentQuestionIndex: number;
  isAssistantTyping: boolean;
  hasCurrentUserResponse: boolean;
  suppressIndicators: boolean;
};

function useChatIndicatorsAnimation({
  chatScrollRef,
  messagesLength,
  currentQuestionIndex,
  isAssistantTyping,
  hasCurrentUserResponse,
  suppressIndicators,
}: UseChatIndicatorsAnimationParams) {
  useEffect(() => {
    const chat = chatScrollRef.current;
    if (!chat) return;
    if (suppressIndicators) return;
    if (prefersReducedMotion()) return;

    let cancelled = false;
    const tweens: unknown[] = [];

    void loadGsap()
      .then(({ default: gsap }) => {
        if (cancelled) return;

        const dotGroups = chat.querySelectorAll<HTMLElement>(
          '[data-chat-dot-group]',
        );

        dotGroups.forEach((group) => {
          const dots = group.querySelectorAll<HTMLElement>('[data-chat-dot]');
          if (dots.length === 0) return;

          gsap.set(dots, { y: 0, opacity: 0.38 });
          tweens.push(
            gsap.to(dots, {
              y: -3,
              opacity: 1,
              duration: 0.36,
              ease: 'sine.inOut',
              repeat: -1,
              yoyo: true,
              stagger: 0.14,
            }),
          );
        });
      })
      .catch(reportGsapLoadError);

    return () => {
      cancelled = true;
      tweens.forEach((tween) => {
        if (
          tween &&
          typeof (tween as { kill?: () => void }).kill === 'function'
        ) {
          (tween as { kill: () => void }).kill();
        }
      });
    };
  }, [
    messagesLength,
    currentQuestionIndex,
    isAssistantTyping,
    hasCurrentUserResponse,
    suppressIndicators,
    chatScrollRef,
  ]);
}

type UseChatAutoScrollParams = {
  chatScrollRef: RefObject<HTMLDivElement | null>;
  messagesLength: number;
  currentQuestionIndex: number;
  isAssistantTyping: boolean;
};

function useChatAutoScroll({
  chatScrollRef,
  messagesLength,
  currentQuestionIndex,
  isAssistantTyping,
}: UseChatAutoScrollParams) {
  useEffect(() => {
    const chat = chatScrollRef.current;
    if (!chat) return;

    chat.scrollTo({
      top: chat.scrollHeight,
      behavior: prefersReducedMotion() ? 'auto' : 'smooth',
    });
  }, [messagesLength, currentQuestionIndex, isAssistantTyping, chatScrollRef]);
}

function getLatestAssistantMessageId(
  messages: QuizChatMessage[],
): string | null {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message?.sender === 'assistant') {
      return message.id;
    }
  }
  return null;
}

export function QuizChatThread({
  messages,
  isAssistantTyping,
  currentQuestionIndex,
  hasAssistantPromptCompleted,
  hasCurrentUserResponse,
  assistantName,
  assistantAvatarSrc,
  questionHeadingId,
  suppressIndicators = false,
}: QuizChatThreadProps) {
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const animateBubbleIn = useChatBubbleEntranceAnimation();

  useChatIndicatorsAnimation({
    chatScrollRef,
    messagesLength: messages.length,
    currentQuestionIndex,
    isAssistantTyping,
    hasCurrentUserResponse,
    suppressIndicators,
  });

  useChatAutoScroll({
    chatScrollRef,
    messagesLength: messages.length,
    currentQuestionIndex,
    isAssistantTyping,
  });

  const latestAssistantMessageId = useMemo(
    () => getLatestAssistantMessageId(messages),
    [messages],
  );

  return (
    <div
      data-onboarding-quiz-chat
      ref={chatScrollRef}
      role="log"
      aria-live="polite"
      aria-relevant="additions text"
      aria-atomic={false}
      className="bg-background order-1 mx-auto flex w-full max-w-180 min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-auto overscroll-contain scroll-smooth motion-reduce:scroll-auto px-3 py-5 sm:px-4 sm:py-6"
      style={{ scrollbarGutter: 'stable' }}
    >
      <div className="flex w-full flex-col gap-4">
        {messages.map((message) =>
          message.sender === 'assistant' ? (
            <AssistantChatRow
              key={message.id}
              message={message}
              assistantName={assistantName}
              assistantAvatarSrc={assistantAvatarSrc}
              questionHeadingId={questionHeadingId}
              isLatestAssistantMessage={message.id === latestAssistantMessageId}
              animateBubbleIn={animateBubbleIn}
            />
          ) : (
            <UserChatRow
              key={message.id}
              message={message}
              animateBubbleIn={animateBubbleIn}
            />
          ),
        )}

        {!suppressIndicators && isAssistantTyping ? (
          <AssistantTypingRow
            key={`typing-${currentQuestionIndex}`}
            assistantName={assistantName}
            assistantAvatarSrc={assistantAvatarSrc}
            animateBubbleIn={animateBubbleIn}
          />
        ) : null}

        {!suppressIndicators &&
        hasAssistantPromptCompleted &&
        !hasCurrentUserResponse ? (
          <UserPendingRow
            key={`pending-${currentQuestionIndex}`}
            animateBubbleIn={animateBubbleIn}
          />
        ) : null}
      </div>
    </div>
  );
}
