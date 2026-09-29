'use client';

import {
  useCallback,
  useRef,
  type FocusEvent,
  type KeyboardEvent,
  type RefObject,
} from 'react';

import { loadGsap, reportGsapLoadError } from '@/web-app/lib/load-gsap';
import { prefersReducedMotion } from '@/web-app/lib/motion';
import { getNextOptionIndex, isOptionSelectionKey } from './option-navigation';
import { useComposerGradient } from './use-composer-gradient';

type ComposerCallbacks = {
  onComposerFocus: () => void;
  onComposerBlur: () => void;
  onComposerSend: (selectedOptionIndex: number | null) => void;
};

/**
 * The Other reply's shell and its focus: focusing the field starts the shell's gradient, and
 * leaving the shell stops it. Moving between the field and the send button, inside the shell,
 * isn't leaving it. dismissComposer puts it away (Escape).
 */
function useComposerFocus({
  currentQuestionIndex,
  onComposerFocus,
  onComposerBlur,
}: Omit<ComposerCallbacks, 'onComposerSend'> & {
  currentQuestionIndex: number;
}) {
  const composerShellRef = useRef<HTMLFieldSetElement>(null);
  const { start: startComposerGradient, stop: stopComposerGradient } =
    useComposerGradient(composerShellRef, currentQuestionIndex);

  const dismissComposer = useCallback(() => {
    onComposerBlur();
    stopComposerGradient();
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  }, [onComposerBlur, stopComposerGradient]);

  const handleComposerFocus = useCallback(() => {
    onComposerFocus();
    startComposerGradient();
  }, [onComposerFocus, startComposerGradient]);

  const handleComposerControlBlur = useCallback(
    (event: FocusEvent<HTMLInputElement | HTMLButtonElement>) => {
      const nextTarget = event.relatedTarget;
      if (nextTarget && composerShellRef.current?.contains(nextTarget)) {
        return;
      }

      onComposerBlur();
      stopComposerGradient();
    },
    [onComposerBlur, stopComposerGradient],
  );

  return {
    composerShellRef,
    stopComposerGradient,
    dismissComposer,
    handleComposerFocus,
    handleComposerControlBlur,
  };
}

/** A small press on the send button as the reply goes. */
function pressSendButton(composerSendRef: RefObject<HTMLButtonElement | null>) {
  if (prefersReducedMotion()) return;

  void loadGsap()
    .then(({ default: loadedGsap }) => {
      if (!composerSendRef.current) return;
      loadedGsap.fromTo(
        composerSendRef.current,
        { scale: 0.94 },
        { scale: 1, duration: 0.18, ease: 'power2.out' },
      );
    })
    .catch(reportGsapLoadError);
}

type ComposerSendParams = Pick<
  ComposerCallbacks,
  'onComposerBlur' | 'onComposerSend'
> & {
  selectedOption: number | null;
  canSend: boolean;
  stopComposerGradient: () => void;
  dismissComposer: () => void;
};

/**
 * Sending the answer from the composer: by its button, or Enter in the field once there's
 * something to send. Escape in either puts the composer away instead.
 */
function useComposerSend({
  selectedOption,
  canSend,
  onComposerBlur,
  onComposerSend,
  stopComposerGradient,
  dismissComposer,
}: ComposerSendParams) {
  const composerSendRef = useRef<HTMLButtonElement>(null);

  const handleComposerSendKeyDown = useCallback(
    (event: KeyboardEvent<HTMLButtonElement>) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      dismissComposer();
    },
    [dismissComposer],
  );

  const handleComposerSend = useCallback(() => {
    pressSendButton(composerSendRef);

    onComposerBlur();
    stopComposerGradient();
    onComposerSend(selectedOption);
  }, [onComposerBlur, onComposerSend, selectedOption, stopComposerGradient]);

  const handleComposerInputKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        dismissComposer();
        return;
      }

      if (event.key !== 'Enter' || !canSend) {
        return;
      }

      event.preventDefault();
      handleComposerSend();
    },
    [canSend, dismissComposer, handleComposerSend],
  );

  return {
    composerSendRef,
    handleComposerSendKeyDown,
    handleComposerSend,
    handleComposerInputKeyDown,
  };
}

/**
 * The Other reply's composer: its shell's focus and gradient, and sending from it. Returns the
 * refs for its shell and send button, and its handlers.
 */
export function useComposerHandlers({
  currentQuestionIndex,
  selectedOption,
  canSend,
  onComposerFocus,
  onComposerBlur,
  onComposerSend,
}: ComposerCallbacks & {
  currentQuestionIndex: number;
  selectedOption: number | null;
  canSend: boolean;
}) {
  const { stopComposerGradient, dismissComposer, ...focus } = useComposerFocus(
    { currentQuestionIndex, onComposerFocus, onComposerBlur },
  );
  const send = useComposerSend({
    selectedOption,
    canSend,
    onComposerBlur,
    onComposerSend,
    stopComposerGradient,
    dismissComposer,
  });

  return { ...focus, ...send };
}

/**
 * The options' handlers: picking one sends it at once; arrows, Home and End move the pick and the
 * focus around the radiogroup, and Enter or Space sends the focused one.
 */
export function useOptionHandlers({
  answerSectionRef,
  options,
  onSelectOption,
  onComposerSend,
}: Pick<ComposerCallbacks, 'onComposerSend'> & {
  answerSectionRef: RefObject<HTMLDivElement | null>;
  options: readonly string[];
  onSelectOption: (index: number) => void;
}) {
  const handleOptionSelect = useCallback(
    (optionIndex: number) => {
      onSelectOption(optionIndex);
      onComposerSend(optionIndex);
    },
    [onComposerSend, onSelectOption],
  );

  const handleOptionKeyDown = useCallback(
    (event: KeyboardEvent<HTMLButtonElement>, optionIndex: number) => {
      if (options.length === 0) return;

      if (isOptionSelectionKey(event.key)) {
        event.preventDefault();
        handleOptionSelect(optionIndex);
        return;
      }

      const nextIndex = getNextOptionIndex(
        event.key,
        optionIndex,
        options.length,
      );
      if (nextIndex === null) return;

      event.preventDefault();
      onSelectOption(nextIndex);

      answerSectionRef.current
        ?.querySelector<HTMLButtonElement>(
          `[data-quiz-option-index="${nextIndex}"]`,
        )
        ?.focus();
    },
    [answerSectionRef, handleOptionSelect, onSelectOption, options.length],
  );

  return { handleOptionSelect, handleOptionKeyDown };
}
