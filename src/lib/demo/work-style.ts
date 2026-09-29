import { quizConfig } from "@/app/(main)/onboarding/_data/quiz-config";
import { WORKSTYLE_DIMENSIONS } from "@/web-app/lib/workstyle/dimensions";
import { workstyleResultsContent } from "@/web-app/lib/workstyle/results-content";

/**
 * The work-style quiz is the real app's own onboarding, ported as-is to /onboarding/<role> (see
 * src/app/(main)/onboarding). Its script (_data/quiz-config.json) and its results copy
 * (src/web-app/lib/workstyle/results-content.json) are the one source for the questions, the tag
 * each answer earns and what that tag means; this module reads them for everything outside the
 * quiz — badges and their tooltips, and how two sides line up trait by trait (traitFit).
 *
 * Nobody has traits until they take the quiz, and a portal sends its side there before anything
 * else (QuizGate). An answer is kept as a value on a 1–5 scale: the real quiz's
 * position 1 (fastest) to 4 (most deliberate). The match percentage is not scored from them — the
 * real app's matching works differently, so the demo keeps its seeded figure.
 */

export type WorkStyleSide = "team" | "independent";

type WorkStyleAnswer = { label: string; tag: string; meaning: string; value: number };
type WorkStyleQuestion = { trait: string; question: string; answers: WorkStyleAnswer[] };

/** A tag someone earned: the trait it came from, what it means and the answer that earned it. */
export type WorkStyleTag = { label: string; trait: number; meaning: string; answer: string };

/** The six traits in quiz order — the rows of a work-style match, and each tag's colour and icon. */
export const WORK_STYLE_TRAITS = ["Decision Making", "Adaptability", "Responsiveness", "Time Management", "Cooperativeness", "Communication"];

/** The real quiz's answer positions 1–4 on the 1–5 scale. */
const VALUES = [5, 4, 2, 1];
/** The middle of the scale — no answer in the quiz sits there. */
const OTHER_VALUE = 3;

/** How each side appears in the real app's quiz script and its results copy. */
const QUIZ_ROLE = { team: "client", independent: "talent" } as const;

/** The side that takes the quiz as this role of the real app. */
export const sideOfQuizRole = (role: (typeof QUIZ_ROLE)[WorkStyleSide]): WorkStyleSide => (role === "client" ? "team" : "independent");
const AUDIENCE = { team: "team-builder", independent: "independent" } as const;

function questionsFor(side: WorkStyleSide): WorkStyleQuestion[] {
  const sentences = workstyleResultsContent.sentences[AUDIENCE[side]];
  return quizConfig[QUIZ_ROLE[side]].questions.map((q, trait) => ({
    trait: WORK_STYLE_TRAITS[trait],
    question: q.questionText,
    answers: q.answers.map((a) => ({ label: a.answerText, tag: a.tag, meaning: sentences[q.dimensionId][a.tag] ?? "", value: VALUES[a.position - 1] })),
  }));
}

const WORK_STYLE_QUIZ: Record<WorkStyleSide, WorkStyleQuestion[]> = { team: questionsFor("team"), independent: questionsFor("independent") };

/** The value an answer at this position of the real quiz is kept as. */
export const valueForPosition = (position: number) => VALUES[position - 1] ?? OTHER_VALUE;

/** How two sides' answers on one trait line up: the same approach, the next one over, or further apart. */
export type TraitFit = "same" | "close" | "apart";

/**
 * Where two answers on a trait sit against each other — what the old chart showed as overlapping
 * bubbles. The two quizzes word their tags for their own side ("Decisive" for a Team Builder is
 * "Proactive" for an Independent), so a trait lines up on the answer's position, never the tag's name.
 */
export function traitFit(a: number | undefined, b: number | undefined): TraitFit | null {
  const pa = a === undefined ? -1 : VALUES.indexOf(a);
  const pb = b === undefined ? -1 : VALUES.indexOf(b);
  if (pa < 0 || pb < 0) return null;
  const gap = Math.abs(pa - pb);
  return gap === 0 ? "same" : gap === 1 ? "close" : "apart";
}

/** Answers for all six traits — anything shorter is a quiz not taken. */
const complete = (answers: readonly number[]) => answers.length === WORKSTYLE_DIMENSIONS.length;

/** The tag each answer earned, in trait order. None until the quiz is taken. */
export function traitTagsFor(answers: readonly number[], side: WorkStyleSide): WorkStyleTag[] {
  return answers.flatMap((value, trait) => {
    const a = WORK_STYLE_QUIZ[side][trait]?.answers.find((x) => x.value === value);
    return a ? [{ label: a.tag, trait, meaning: a.meaning, answer: a.label }] : [];
  });
}

const storageKey = (side: WorkStyleSide) => `hireable.demo.${side === "team" ? "team" : "ind"}.workStyle`;

/**
 * A side's saved answers, read from storage — each portal keeps its own, so this is how one side
 * sees the other's (the talent the company's badges, the Team Builder the talent's match). Empty
 * until that side has taken the quiz, and on the server, where there is no storage.
 */
export function storedWorkStyle(side: WorkStyleSide): number[] {
  if (typeof window === "undefined") return [];
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey(side)) ?? "null");
    return Array.isArray(saved) && complete(saved) ? saved : [];
  } catch {
    return [];
  }
}

/** The quiz's answers, where that side's portal picks them up the next time it loads. */
export function saveWorkStyle(side: WorkStyleSide, answers: readonly number[]) {
  localStorage.setItem(storageKey(side), JSON.stringify(answers));
}

/** Whether this side has taken the quiz. Until it has, its portal sends it to the quiz first. */
export const quizTaken = (side: WorkStyleSide) => storedWorkStyle(side).length > 0;

/** Where this side takes the quiz: the real app's onboarding, at its own path. */
export const quizPath = (side: WorkStyleSide) => `/onboarding/${QUIZ_ROLE[side]}`;
