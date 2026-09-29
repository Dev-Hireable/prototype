/**
 * From the assistant's closing line to the curtain. It used to be a still screen; now the line
 * sits in the chat for FINAL_SPOTLIGHT_DELAY_MS, then lifts out of it into the middle of the screen
 * while the rest of the quiz fades away, with a spinner after it until the curtain comes down.
 */
export const FINAL_ASSISTANT_WRAP_UP_DELAY_MS = 2000;
export const FINAL_SPOTLIGHT_DELAY_MS = 450;

/**
 * Builds the assistant lines shown before the current question: a greeting on
 * the first question, an acknowledgement of the previous answer afterwards, or
 * just the follow-up prompt when we are asking the user to elaborate.
 */
export function buildAssistantThread(params: {
  currentQuestionIndex: number;
  followupPrompt: string | null;
  greeting: string;
  question: string;
  transitionAcknowledgement: string | null;
}): string[] {
  const {
    currentQuestionIndex,
    followupPrompt,
    greeting,
    question,
    transitionAcknowledgement,
  } = params;
  const lines: string[] = [];

  if (followupPrompt) {
    lines.push(followupPrompt);
    return lines;
  }

  if (currentQuestionIndex === 0) {
    lines.push(greeting);
  } else if (transitionAcknowledgement) {
    lines.push(transitionAcknowledgement);
  }

  lines.push(question);
  return lines;
}

/**
 * A submission is either a tapped option (carries an index, no free text) or a
 * typed reply (carries free text, no index) — never both.
 */
function toPendingSubmission(
  displayedResponseText: string,
  selectedOptionIndex: number | null,
) {
  return {
    displayedResponseText,
    payload: {
      selectedOptionIndex,
      freeText: selectedOptionIndex === null ? displayedResponseText : '',
      displayedResponseText,
    },
  };
}

export function buildPendingSubmission(params: {
  preferredSelectedOptionIndex: number | null;
  selectedOption: number | null;
  options: readonly string[];
  customReply: string;
}) {
  const { preferredSelectedOptionIndex, selectedOption, options, customReply } =
    params;
  const trimmedCustomReply = customReply.trim();
  const resolvedSelectedOption = preferredSelectedOptionIndex ?? selectedOption;
  const selectedLabel =
    resolvedSelectedOption !== null && resolvedSelectedOption >= 0
      ? (options[resolvedSelectedOption] ?? null)
      : null;

  // Tapping an option this turn wins over whatever is sitting in the composer.
  const hasExplicitSelectedOption =
    preferredSelectedOptionIndex !== null && preferredSelectedOptionIndex >= 0;
  if (hasExplicitSelectedOption && selectedLabel) {
    return toPendingSubmission(selectedLabel, resolvedSelectedOption);
  }

  if (trimmedCustomReply) {
    return toPendingSubmission(trimmedCustomReply, null);
  }

  // Falls back to an option selected on an earlier keystroke, if any.
  return selectedLabel
    ? toPendingSubmission(selectedLabel, resolvedSelectedOption)
    : null;
}
