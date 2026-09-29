import type { WorkstyleDimension } from '@/web-app/lib/workstyle/dimensions';
import { FINAL_ASSISTANT_WRAP_UP_DELAY_MS } from './quiz-thread';
import type {
  PendingFollowup,
  QuizAssessment,
} from './quiz-response-classifier';

type OnboardingStep = 'intro' | 'quiz' | 'results';

export type WizardFlowState = {
  step: OnboardingStep;
  isQuizSubmitting: boolean;
  currentQuestionIndex: number;
  selectedOption: number | null;
  assessmentsByDimension: Partial<Record<WorkstyleDimension, QuizAssessment>>;
  pendingFollowup: PendingFollowup | null;
  lastAssistantAcknowledgement: string | null;
  workstyleTags: string[];
};

export type WizardFlowAction =
  | { type: 'setStep'; step: OnboardingStep }
  | { type: 'setQuizSubmitting'; isSubmitting: boolean }
  | { type: 'setCurrentQuestionIndex'; index: number }
  | { type: 'setSelectedOption'; option: number | null }
  | { type: 'setPendingFollowup'; followup: PendingFollowup | null }
  | { type: 'setLastAssistantAcknowledgement'; text: string | null }
  | { type: 'upsertAssessment'; assessment: QuizAssessment }
  | { type: 'setWorkstyleTags'; tags: string[] };

export const INITIAL_WIZARD_FLOW_STATE: WizardFlowState = {
  step: 'intro',
  isQuizSubmitting: false,
  currentQuestionIndex: 0,
  selectedOption: null,
  assessmentsByDimension: {},
  pendingFollowup: null,
  lastAssistantAcknowledgement: null,
  workstyleTags: [],
};

// The answers are saved before the assistant's wrap-up now, so the safety net waits out the
// wrap-up and the curtain coming down after it.
export const QUIZ_FINAL_TRANSITION_FALLBACK_MS =
  FINAL_ASSISTANT_WRAP_UP_DELAY_MS + 2000;

function assertUnhandledAction(action: never): never {
  throw new Error(
    `Unhandled onboarding flow action: ${JSON.stringify(action)}`,
  );
}

export function onboardingFlowReducer(
  state: WizardFlowState,
  action: WizardFlowAction,
): WizardFlowState {
  switch (action.type) {
    case 'setStep':
      return { ...state, step: action.step };
    case 'setQuizSubmitting':
      return { ...state, isQuizSubmitting: action.isSubmitting };
    case 'setCurrentQuestionIndex':
      return { ...state, currentQuestionIndex: action.index };
    case 'setSelectedOption':
      return { ...state, selectedOption: action.option };
    case 'setPendingFollowup':
      return { ...state, pendingFollowup: action.followup };
    case 'setLastAssistantAcknowledgement':
      return { ...state, lastAssistantAcknowledgement: action.text };
    case 'upsertAssessment':
      return {
        ...state,
        assessmentsByDimension: {
          ...state.assessmentsByDimension,
          [action.assessment.dimensionId]: action.assessment,
        },
      };
    case 'setWorkstyleTags':
      return { ...state, workstyleTags: action.tags };
    default:
      return assertUnhandledAction(action);
  }
}
