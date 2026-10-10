import type { ReactNode } from 'react';

import type { QuizChatMessage } from '../../_lib/quiz-types';

export type BubbleAnimationStyle = 'assistant' | 'user' | 'typing';
export type AnimateBubbleIn = (
  element: HTMLElement | null,
  style: BubbleAnimationStyle,
) => void;

const USER_BUBBLE_CLASS =
  'inline-flex w-fit max-w-[85%] flex-row items-center gap-2.5 rounded-[16px] bg-muted px-4 py-3 sm:px-6 sm:py-4';

const USER_BUBBLE_TEXT_CLASS =
  'font-secondary wrap-break-word text-foreground max-w-full text-left text-sm font-normal leading-[120%] tracking-[0.2px]';

const CHAT_DOT_GROUP_CLASS =
  'relative h-[22px] w-[42px] flex-none rounded-[8px] bg-muted';

const USER_ROW_CLASS =
  'flex w-full flex-none flex-col items-end justify-center gap-2.5 pl-8 sm:pl-24';

/**
 * Where a row sits in a run of the assistant's rows, Messenger style: the name heads the run and
 * the avatar closes it, so back-to-back lines don't repeat either.
 */
export type AssistantRowPlace = { first: boolean; last: boolean };

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
        className="text-foreground wrap-break-word w-full text-sm font-normal leading-[120%] tracking-[0.2px] whitespace-pre-line"
      >
        {message.text}
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
      </div>
    </div>
  );
}

type ChatDotGroupProps = {
  statusLabel?: string;
  animateBubbleIn?: AnimateBubbleIn;
  animationStyle?: BubbleAnimationStyle;
};

function ChatDotGroup({
  statusLabel,
  animateBubbleIn,
  animationStyle,
}: ChatDotGroupProps) {
  return (
    <div
      data-chat-dot-group
      ref={
        animateBubbleIn && animationStyle
          ? (node) => {
              animateBubbleIn(node, animationStyle);
            }
          : undefined
      }
      className={CHAT_DOT_GROUP_CLASS}
      role={statusLabel ? 'status' : undefined}
      aria-live={statusLabel ? 'polite' : undefined}
      aria-label={statusLabel}
      aria-hidden={statusLabel ? undefined : true}
    >
      <span
        data-chat-dot
        className="bg-neutral-muted absolute left-2 top-2 size-1.5 rounded-full"
      />
      <span
        data-chat-dot
        className="bg-neutral-muted absolute left-4.5 top-2 size-1.5 rounded-full"
      />
      <span
        data-chat-dot
        className="bg-neutral-muted absolute left-7 top-2 size-1.5 rounded-full"
      />
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
      <ChatDotGroup
        statusLabel={`${assistantName} is typing`}
        animateBubbleIn={animateBubbleIn}
        animationStyle="typing"
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
      <div
        data-user-pending-bubble
        ref={(node) => {
          animateBubbleIn(node, 'user');
        }}
      >
        <ChatDotGroup />
      </div>
    </div>
  );
}
