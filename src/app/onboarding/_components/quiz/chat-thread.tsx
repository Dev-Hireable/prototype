'use client';

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  type ReactNode,
  type RefObject,
} from 'react';

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

/**
 * A bubble's entrance: it grows up into place from its speaker's side. The typing dots come in
 * quicker; a message's will-change is cleared once it's in.
 */
function playBubbleEntrance(
  gsap: typeof import('gsap').default,
  element: HTMLElement,
  style: BubbleAnimationStyle,
) {
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
}

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

          playBubbleEntrance(gsap, element, style);
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

/** Sets the dots of each typing indicator in the chat bobbing in turn, collecting their tweens. */
function bobChatDots(
  gsap: typeof import('gsap').default,
  chat: HTMLDivElement,
  tweens: unknown[],
) {
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
}

/** Stops the tweens bobChatDots started. */
function killTweens(tweens: unknown[]) {
  tweens.forEach((tween) => {
    if (
      tween &&
      typeof (tween as { kill?: () => void }).kill === 'function'
    ) {
      (tween as { kill: () => void }).kill();
    }
  });
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

        bobChatDots(gsap, chat, tweens);
      })
      .catch(reportGsapLoadError);

    return () => {
      cancelled = true;
      killTweens(tweens);
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

/** How near the bottom still counts as reading along, in px. */
const FOLLOW_SLACK_PX = 48;
/** Room left above the assistant's latest line when it has to be shown from its top, in px. */
const LATEST_LINE_MARGIN_PX = 12;

/**
 * Scrolls the chat down to its bottom, but no further than the top of the assistant's latest
 * line, and never up.
 */
function scrollToLatest(
  chat: HTMLDivElement,
  list: HTMLDivElement,
  behavior: ScrollBehavior,
) {
  const bottom = chat.scrollHeight - chat.clientHeight;
  const lines = list.querySelectorAll('[data-quiz-assistant-message]');
  const latestRow = lines[lines.length - 1]?.closest(
    '[data-quiz-assistant-row]',
  );
  const latestTop = latestRow
    ? latestRow.getBoundingClientRect().top -
      chat.getBoundingClientRect().top +
      chat.scrollTop -
      LATEST_LINE_MARGIN_PX
    : bottom;
  const top = Math.max(chat.scrollTop, Math.min(bottom, latestTop));
  if (top - chat.scrollTop < 1) return;
  chat.scrollTo({ top, behavior });
}

/**
 * The chat's scroll listener: back at the bottom, the reader is following again; any scroll up
 * is them rereading, so the chat stops following them.
 */
function trackFollowing(
  chat: HTMLDivElement,
  followingRef: RefObject<boolean>,
) {
  let lastTop = chat.scrollTop;
  return () => {
    const top = chat.scrollTop;
    if (chat.scrollHeight - chat.clientHeight - top <= FOLLOW_SLACK_PX) {
      followingRef.current = true;
    } else if (top < lastTop) {
      followingRef.current = false;
    }
    lastTop = top;
  };
}

type UseChatAutoScrollParams = {
  chatScrollRef: RefObject<HTMLDivElement | null>;
  listRef: RefObject<HTMLDivElement | null>;
  latestMessage: QuizChatMessage | undefined;
};

/**
 * Keeps the conversation in view as it grows, the way a chat does. While the reader is at the
 * bottom, each new line (and the typing dots) glides up into view, and a resized window keeps its
 * place. Once they scroll up to reread, it leaves them there until they're back at the bottom or
 * answer. It used to jump to the bottom on every line whatever the reader was doing, and it only
 * listened for new lines, so a resized window left the chat wherever it happened to be.
 *
 * It never scrolls the assistant's latest line off the top: on a short screen the bottom of the
 * chat can be below the start of the question, and a question is read from its first word. And it
 * only ever scrolls down, so any scroll up is the reader's.
 */
function useChatAutoScroll({
  chatScrollRef,
  listRef,
  latestMessage,
}: UseChatAutoScrollParams) {
  const followingRef = useRef(true);
  const latestUserMessageId =
    latestMessage?.sender === 'user' ? latestMessage.id : null;

  // Answering brings the reader back down, wherever they'd scrolled to. A layout effect, so it's
  // in place before the resize observer sees their answer's bubble.
  useLayoutEffect(() => {
    if (latestUserMessageId) followingRef.current = true;
  }, [latestUserMessageId]);

  useEffect(() => {
    const chat = chatScrollRef.current;
    const list = listRef.current;
    if (!chat || !list) return;

    const follow = (behavior: ScrollBehavior) => {
      if (!followingRef.current) return;
      scrollToLatest(chat, list, behavior);
    };

    const handleScroll = trackFollowing(chat, followingRef);

    // Every change in size, not a list of state changes: a line or the typing dots arriving, a
    // bubble swapping in, the window resizing.
    const observer = new ResizeObserver((entries) => {
      // New lines glide in; the chat itself resizing (the window did) just keeps its place.
      const chatResized = entries.some((entry) => entry.target === chat);
      follow(chatResized || prefersReducedMotion() ? 'auto' : 'smooth');
    });
    observer.observe(chat);
    observer.observe(list);
    chat.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      observer.disconnect();
      chat.removeEventListener('scroll', handleScroll);
    };
  }, [chatScrollRef, listRef]);
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

/** The chat's scrolling band and the centred column the conversation sits in. */
function ChatScroller({
  chatScrollRef,
  listRef,
  children,
}: {
  chatScrollRef: RefObject<HTMLDivElement | null>;
  listRef: RefObject<HTMLDivElement | null>;
  children: ReactNode;
}) {
  return (
    // The scroller runs the full width of the window with the conversation centred inside it, so
    // the wheel scrolls it from anywhere across the band, the way a page scrolls. It used to be the
    // conversation's own 720px column, and the wheel did nothing an inch either side of it. It
    // draws no scrollbar, so the chat reads as the page rather than a box inside it. The inline
    // style hides the bar in Chromium and Firefox (inline, because globals.css gives Firefox a thin
    // bar on every element, and that rule would outrank a class); the class covers older Safari.
    <div
      data-onboarding-quiz-chat
      ref={chatScrollRef}
      role="log"
      aria-live="polite"
      aria-relevant="additions text"
      aria-atomic={false}
      className="bg-background order-1 flex w-full min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-auto overscroll-contain py-5 sm:py-6 short:py-3 [&::-webkit-scrollbar]:hidden"
      style={{ scrollbarWidth: 'none' }}
    >
      <div
        ref={listRef}
        className="mx-auto flex w-full max-w-180 flex-col gap-4 px-3 sm:px-4"
      >
        {children}
      </div>
    </div>
  );
}

/** The conversation so far: the assistant's lines and the reader's answers, in order. */
function ChatMessages({
  messages,
  assistantName,
  assistantAvatarSrc,
  questionHeadingId,
  animateBubbleIn,
}: Pick<
  QuizChatThreadProps,
  'messages' | 'assistantName' | 'assistantAvatarSrc' | 'questionHeadingId'
> & { animateBubbleIn: AnimateBubbleIn }) {
  const latestAssistantMessageId = useMemo(
    () => getLatestAssistantMessageId(messages),
    [messages],
  );

  return (
    <>
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
    </>
  );
}

/**
 * What's still to come in the conversation: the assistant's typing dots, or the reader's pending
 * bubble once the question is out and unanswered. Neither shows through the wrap-up.
 */
function ChatIndicators({
  isAssistantTyping,
  currentQuestionIndex,
  hasAssistantPromptCompleted,
  hasCurrentUserResponse,
  assistantName,
  assistantAvatarSrc,
  suppressIndicators,
  animateBubbleIn,
}: Omit<QuizChatThreadProps, 'messages' | 'questionHeadingId'> & {
  animateBubbleIn: AnimateBubbleIn;
}) {
  return (
    <>
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
    </>
  );
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
  const listRef = useRef<HTMLDivElement>(null);
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
    listRef,
    latestMessage: messages[messages.length - 1],
  });

  return (
    <ChatScroller chatScrollRef={chatScrollRef} listRef={listRef}>
      <ChatMessages
        messages={messages}
        assistantName={assistantName}
        assistantAvatarSrc={assistantAvatarSrc}
        questionHeadingId={questionHeadingId}
        animateBubbleIn={animateBubbleIn}
      />

      <ChatIndicators
        isAssistantTyping={isAssistantTyping}
        currentQuestionIndex={currentQuestionIndex}
        hasAssistantPromptCompleted={hasAssistantPromptCompleted}
        hasCurrentUserResponse={hasCurrentUserResponse}
        assistantName={assistantName}
        assistantAvatarSrc={assistantAvatarSrc}
        suppressIndicators={suppressIndicators}
        animateBubbleIn={animateBubbleIn}
      />
    </ChatScroller>
  );
}
