import type { ReactNode } from 'react';

import type { QuizChatMessage } from '../../_lib/quiz-types';
import { TypingDots } from '@/components/portal/typing-dots';

export type BubbleAnimationStyle = 'assistant' | 'user' | 'typing';
export type AnimateBubbleIn = (
  element: HTMLElement | null,
  style: BubbleAnimationStyle,
) => void;

const USER_BUBBLE_CLASS =
  'relative inline-flex w-fit max-w-[85%] flex-row items-center gap-2.5 rounded-[16px] rounded-br-[4px] bg-muted px-4 py-3 sm:px-6 sm:py-4';

/** The assistant's lines, in a bubble of their own colour; the last of a run carries the tail. */
const ASSISTANT_BUBBLE_CLASS =
  'relative w-fit max-w-full rounded-[16px] bg-accent-bg px-4 py-3 text-foreground wrap-break-word text-sm font-normal leading-[140%] tracking-[0.2px] whitespace-pre-line sm:px-5';

const USER_BUBBLE_TEXT_CLASS =
  'font-secondary wrap-break-word text-foreground max-w-full text-left text-sm font-normal leading-[120%] tracking-[0.2px]';

/**
 * A chat bubble's tail: a curved point on the speaker's side, at the bottom, in the bubble's own
 * colour (`className` sets the fill). It sits just outside the bubble, whose corner on that side is
 * squared off to meet it, Messenger style.
 */
function BubbleTail({ side, className }: { side: 'left' | 'right'; className: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 10 14"
      className={`absolute bottom-0 h-3.5 w-2.5 ${side === 'left' ? '-left-2' : '-right-2 -scale-x-100'} ${className}`}
    >
      <path d="M10 0 V14 H0 C5 13 9 9 10 0 Z" />
    </svg>
  );
}

const USER_ROW_CLASS =
  'flex w-full flex-none flex-col items-end justify-center gap-2.5 pl-8 sm:pl-24';

/**
 * Where a row sits in a run of the assistant's rows, Messenger style: the name heads the run and
 * the avatar closes it, so back-to-back lines don't repeat either.
 */
type AssistantRowPlace = { first: boolean; last: boolean };

type AssistantRowShellProps = {
  assistantName: string;
  assistantAvatarSrc: string;
  place: AssistantRowPlace;
  children: ReactNode;
};

function AssistantRowShell({
  assistantName,
  assistantAvatarSrc,
  place,
  children,
}: AssistantRowShellProps) {
  return (
    <div className="flex w-full flex-none flex-col items-start gap-2.5 pr-8 sm:pr-24">
      <div
        data-quiz-assistant-row
        className="flex w-full max-w-full flex-row items-end gap-3 sm:max-w-[580px] sm:gap-4"
      >
        {/* Held in place when it's hidden, so every line in the run starts at the same edge. */}
        <div
          aria-hidden
          className="size-9 flex-none rounded-[25px] bg-contain bg-center bg-no-repeat"
          style={
            place.last
              ? { backgroundImage: `url(${assistantAvatarSrc})` }
              : undefined
          }
        />
        <div className="flex min-w-0 flex-1 flex-col items-start gap-2">
          {place.first ? (
            <p className="text-foreground text-sm font-semibold leading-[120%] tracking-[0.2px]">
              {assistantName}
            </p>
          ) : null}
          <div className={place.last ? 'w-full min-h-[44px]' : 'w-full'}>{children}</div>
        </div>
      </div>
    </div>
  );
}

type AssistantChatRowProps = {
  message: QuizChatMessage;
  assistantName: string;
  assistantAvatarSrc: string;
  questionHeadingId?: string;
  isLatestAssistantMessage: boolean;
  place: AssistantRowPlace;
  animateBubbleIn: AnimateBubbleIn;
};

export function AssistantChatRow({
  message,
  assistantName,
  assistantAvatarSrc,
  questionHeadingId,
  isLatestAssistantMessage,
  place,
  animateBubbleIn,
}: AssistantChatRowProps) {
  return (
    <AssistantRowShell
      assistantName={assistantName}
      assistantAvatarSrc={assistantAvatarSrc}
      place={place}
    >
      <p
        ref={(node) => {
          animateBubbleIn(node, 'assistant');
        }}
        id={isLatestAssistantMessage ? questionHeadingId : undefined}
        data-quiz-assistant-message
        className={`${ASSISTANT_BUBBLE_CLASS} ${place.last ? 'rounded-bl-[4px]' : ''}`}
      >
        {message.text}
        {place.last ? <BubbleTail side="left" className="fill-accent-bg" /> : null}
      </p>
    </AssistantRowShell>
  );
}

type UserChatRowProps = {
  message: QuizChatMessage;
  animateBubbleIn: AnimateBubbleIn;
};

export function UserChatRow({ message, animateBubbleIn }: UserChatRowProps) {
  return (
    <div className={USER_ROW_CLASS}>
      <div
        ref={(node) => {
          animateBubbleIn(node, 'user');
        }}
        className={USER_BUBBLE_CLASS}
      >
        <p className={USER_BUBBLE_TEXT_CLASS}>{message.text}</p>
        <BubbleTail side="right" className="fill-muted" />
      </div>
    </div>
  );
}

type AssistantTypingRowProps = {
  assistantName: string;
  assistantAvatarSrc: string;
  /** False when it follows one of the assistant's lines: the run already has its name. */
  first: boolean;
  animateBubbleIn: AnimateBubbleIn;
};

export function AssistantTypingRow({
  assistantName,
  assistantAvatarSrc,
  first,
  animateBubbleIn,
}: AssistantTypingRowProps) {
  return (
    <AssistantRowShell
      assistantName={assistantName}
      assistantAvatarSrc={assistantAvatarSrc}
      place={{ first, last: true }}
    >
      {/* Every chat's typing dots; the quiz brings the bubble in with its own entrance. */}
      <TypingDots
        tone="assistant"
        label={`${assistantName} is typing`}
        bubbleRef={(node) => {
          animateBubbleIn(node, 'typing');
        }}
      />
    </AssistantRowShell>
  );
}

type UserPendingRowProps = {
  animateBubbleIn: AnimateBubbleIn;
};

export function UserPendingRow({ animateBubbleIn }: UserPendingRowProps) {
  return (
    <div className={USER_ROW_CLASS}>
      <TypingDots
        tone="user"
        bubbleRef={(node) => {
          animateBubbleIn(node, 'user');
        }}
      />
    </div>
  );
}
