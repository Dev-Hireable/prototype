export const REQUIRED_WORKSTYLE_RESPONSE_COUNT = 6;

type WorkstyleCompletionResponse = {
  questionId: number;
  answerId: number;
};

type WorkstyleCompletionQuestion = {
  questionId: number;
  answers: {
    answerId: number;
  }[];
};

type CompleteWorkstyleResponseSummary = {
  workstyleQuestionId: number;
  workstyleAnswerId: number;
};

function countCompleteWorkstyleResponses(
  responses: WorkstyleCompletionResponse[],
): number {
  const answeredQuestionIds = new Set<number>();

  for (const response of responses) {
    if (
      Number.isInteger(response.questionId) &&
      response.questionId > 0 &&
      Number.isInteger(response.answerId) &&
      response.answerId > 0
    ) {
      answeredQuestionIds.add(response.questionId);
    }
  }

  return answeredQuestionIds.size;
}

export function isCompleteWorkstyleResponseSet(
  responses: WorkstyleCompletionResponse[],
): boolean {
  return (
    responses.length === REQUIRED_WORKSTYLE_RESPONSE_COUNT &&
    countCompleteWorkstyleResponses(responses) ===
      REQUIRED_WORKSTYLE_RESPONSE_COUNT
  );
}

export function buildCompleteWorkstyleResponseSummaries(
  responses: WorkstyleCompletionResponse[],
  questions: WorkstyleCompletionQuestion[],
): CompleteWorkstyleResponseSummary[] | null {
  if (questions.length !== REQUIRED_WORKSTYLE_RESPONSE_COUNT) {
    return null;
  }

  const answerIdsByQuestionId = new Map<number, Set<number>>();
  for (const question of questions) {
    answerIdsByQuestionId.set(
      question.questionId,
      new Set(question.answers.map((answer) => answer.answerId)),
    );
  }

  const responseByQuestionId = new Map<number, number>();
  for (const response of responses) {
    const allowedAnswerIds = answerIdsByQuestionId.get(response.questionId);

    if (
      responseByQuestionId.has(response.questionId) ||
      !allowedAnswerIds?.has(response.answerId)
    ) {
      return null;
    }

    responseByQuestionId.set(response.questionId, response.answerId);
  }

  if (responseByQuestionId.size !== questions.length) {
    return null;
  }

  return questions.map((question) => ({
    workstyleQuestionId: question.questionId,
    workstyleAnswerId: responseByQuestionId.get(question.questionId) as number,
  }));
}
