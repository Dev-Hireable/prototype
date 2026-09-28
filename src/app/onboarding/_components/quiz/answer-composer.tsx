import type { ChangeEvent, FocusEvent, KeyboardEvent, RefObject } from 'react';
import { cn } from '@/web-app/lib/utils';
import { InlineSpinner } from '@/web-app/components/ui/inline-spinner';

type ComposerInputHandlers = {
  onInputChange: (nextValue: string) => void;
  onInputFocus: () => void;
  onControlBlur: (
    event: FocusEvent<HTMLInputElement | HTMLButtonElement>,
  ) => void;
  onInputKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
  onSendKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => void;
  onSend: () => void;
};

export type QuizAnswerComposerState = {
  focus: 'focused' | 'idle';
  submission: 'idle' | 'submitting';
  question: 'next' | 'last';
  send: 'enabled' | 'disabled';
};

type QuizAnswerComposerProps = {
  composerShellRef: RefObject<HTMLFieldSetElement | null>;
  composerInputRef: RefObject<HTMLInputElement | null>;
  composerSendRef: RefObject<HTMLButtonElement | null>;
  state: QuizAnswerComposerState;
  customReply: string;
} & ComposerInputHandlers;

const COMPOSER_INPUT_BASE_CLASS =
  'text-foreground h-[17px] w-full bg-transparent text-sm font-normal leading-[120%] tracking-[0.2px] outline-none';

const COMPOSER_SEND_BUTTON_BASE_CLASS =
  'flex size-8 flex-none items-center justify-center rounded-full border border-transparent p-1 leading-none appearance-none transition-colors hover:translate-y-0 active:translate-y-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focused focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70';

const COMPOSER_SHELL_BASE_CLASS =
  'relative isolate order-2 box-border flex h-[56px] w-full max-w-[720px] flex-none flex-col items-start gap-[10px] overflow-visible p-1 transition-[border-color,box-shadow,background-color] duration-300 ease-out';

const COMPOSER_SHELL_FOCUSED_CLASS =
  'rounded-[14px] border border-transparent bg-transparent sm:rounded-[16px]';
const COMPOSER_SHELL_IDLE_CLASS =
  'rounded-[10px] border border-border-hover bg-transparent sm:rounded-[12px]';

const COMPOSER_INNER_BASE_CLASS =
  'box-border flex h-[48px] w-full flex-row items-center justify-between self-stretch px-3';
const COMPOSER_INNER_FOCUSED_CLASS = 'rounded-[12px] bg-background';
const COMPOSER_INNER_IDLE_CLASS = 'rounded-[11px] bg-transparent';
const COMPOSER_INPUT_ID = 'onboarding-quiz-other-reply';

function ComposerSendIcon({
  status,
}: {
  status: QuizAnswerComposerState['send'] | 'submitting';
}) {
  const canSend = status === 'enabled';
  const iconClassName = canSend
    ? 'block size-6 text-primary-foreground'
    : 'block size-6 text-muted-foreground';

  if (status === 'submitting') {
    return <InlineSpinner className={iconClassName} />;
  }

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      className={iconClassName}
      aria-hidden
    >
      <path
        d="M12 5v14M12 5l-5 5M12 5l5 5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * The send button: its arrow lights up once there's something to send, and turns to a spinner
 * while the answer goes. Its label says "See Results" on the last question.
 */
function ComposerSendButton({
  state,
  composerSendRef,
  onSend,
  onControlBlur,
  onSendKeyDown,
}: {
  state: QuizAnswerComposerState;
  composerSendRef: RefObject<HTMLButtonElement | null>;
} & Pick<ComposerInputHandlers, 'onSend' | 'onControlBlur' | 'onSendKeyDown'>) {
  const isSubmitting = state.submission === 'submitting';
  const canSend = state.send === 'enabled';

  return (
    <button
      ref={composerSendRef}
      type="button"
      onClick={onSend}
      onBlur={onControlBlur}
      onKeyDown={onSendKeyDown}
      disabled={!canSend || isSubmitting}
      aria-label={state.question === 'last' ? 'See Results' : 'Send response'}
      className={cn(
        COMPOSER_SEND_BUTTON_BASE_CLASS,
        canSend
          ? 'bg-client hover:bg-client-hover'
          : 'bg-muted hover:bg-surface-hover',
      )}
    >
      <ComposerSendIcon status={isSubmitting ? 'submitting' : state.send} />
    </button>
  );
}

function ComposerInner({
  state,
  composerInputRef,
  composerSendRef,
  customReply,
  onInputChange,
  onInputFocus,
  onControlBlur,
  onInputKeyDown,
  onSendKeyDown,
  onSend,
}: Omit<QuizAnswerComposerProps, 'composerShellRef'>) {
  const focused = state.focus === 'focused';
  const isSubmitting = state.submission === 'submitting';
  const updateCustomReply = (event: ChangeEvent<HTMLInputElement>) =>
    onInputChange(event.target.value);

  return (
    <div
      className={cn(
        COMPOSER_INNER_BASE_CLASS,
        focused ? COMPOSER_INNER_FOCUSED_CLASS : COMPOSER_INNER_IDLE_CLASS,
      )}
    >
      <label htmlFor={COMPOSER_INPUT_ID} className="sr-only">
        Other answer
      </label>
      <input
        id={COMPOSER_INPUT_ID}
        ref={composerInputRef}
        type="text"
        value={customReply}
        onChange={updateCustomReply}
        onFocus={onInputFocus}
        onBlur={onControlBlur}
        onKeyDown={onInputKeyDown}
        disabled={isSubmitting}
        placeholder="Other (type your answer)"
        className={cn(
          COMPOSER_INPUT_BASE_CLASS,
          focused
            ? 'placeholder:text-muted-foreground'
            : 'placeholder:text-text-tertiary',
        )}
      />
      <ComposerSendButton
        state={state}
        composerSendRef={composerSendRef}
        onSend={onSend}
        onControlBlur={onControlBlur}
        onSendKeyDown={onSendKeyDown}
      />
    </div>
  );
}

export function QuizAnswerComposer({
  composerShellRef,
  composerInputRef,
  composerSendRef,
  state,
  customReply,
  onInputChange,
  onInputFocus,
  onControlBlur,
  onInputKeyDown,
  onSendKeyDown,
  onSend,
}: QuizAnswerComposerProps) {
  const focused = state.focus === 'focused';

  return (
    <fieldset
      data-onboarding-quiz-button
      ref={composerShellRef}
      className={cn(
        COMPOSER_SHELL_BASE_CLASS,
        focused ? COMPOSER_SHELL_FOCUSED_CLASS : COMPOSER_SHELL_IDLE_CLASS,
      )}
    >
      <legend className="sr-only">Other answer composer</legend>
      <ComposerInner
        state={state}
        composerInputRef={composerInputRef}
        composerSendRef={composerSendRef}
        customReply={customReply}
        onInputChange={onInputChange}
        onInputFocus={onInputFocus}
        onControlBlur={onControlBlur}
        onInputKeyDown={onInputKeyDown}
        onSendKeyDown={onSendKeyDown}
        onSend={onSend}
      />
    </fieldset>
  );
}
