/**
 * From the assistant's closing line to the curtain. It used to be a still screen; now the line
 * sits in the chat for FINAL_SPOTLIGHT_DELAY_MS, then lifts out of it into the middle of the screen
 * while the rest of the quiz fades away, with a spinner after it until the curtain comes down.
 */
export const FINAL_ASSISTANT_WRAP_UP_DELAY_MS = 2000;
export const FINAL_SPOTLIGHT_DELAY_MS = 450;

export const READY_ANSWER = "Yes, I'm ready";
export const EXPLAIN_ANSWER = 'Explain further';
const ASKING_OPTIONS: readonly string[] = [READY_ANSWER, EXPLAIN_ANSWER];
const EXPLAINED_OPTIONS: readonly string[] = [READY_ANSWER];

/**
 * Before the first scenario the assistant asks whether the reader is ready: the greeting ends on
 * "Are you ready to start?" with Yes and Explain further. Explain further gets the explanation
 * and Yes alone; Yes starts the quiz. The greeting and the first scenario used to come at once.
 */
export type QuizReadiness = 'asking' | 'explained' | 'ready';

/**
 * The readiness turn on screen, or null once the reader is ready. Its index sits before the first
 * question's (0), so every turn has its own and the chat, the answer panel and their animations
 * reset between them as they do between questions.
 */
export function getReadinessTurn(
  readiness: QuizReadiness,
  persona: { greeting: string; explanation: string },
) {
  if (readiness === 'ready') return null;
  return readiness === 'asking'
    ? { index: -2, prompt: persona.greeting, options: ASKING_OPTIONS }
    : { index: -1, prompt: persona.explanation, options: EXPLAINED_OPTIONS };
}

/**
 * Builds the assistant's turn before the current question: one bubble, with the
 * acknowledgement of the previous answer ahead of the question ("Got it.
 * You're mid-sprint and…"), or just the follow-up prompt when we are asking the
 * user to elaborate. They used to be two bubbles in one turn, a lone "Got it."
 * and then the question.
 */
export function buildAssistantThread(params: {
  followupPrompt: string | null;
  question: string;
  transitionAcknowledgement: string | null;
}): string[] {
  const { followupPrompt, question, transitionAcknowledgement } = params;
  if (followupPrompt) {
    return [followupPrompt];
  }

  return [
    transitionAcknowledgement
      ? `${transitionAcknowledgement} ${question}`
      : question,
  ];
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
