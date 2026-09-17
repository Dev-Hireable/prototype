"use client";

import { useState, type Dispatch, type SetStateAction } from "react";
import { Input } from "@/components/independent/ui";
import { OTHER_VALUE, WORK_STYLE_QUESTIONS } from "@/lib/independent/data";

/**
 * OB-002 / OB-003 / IN-064 — the work-style quiz, in one place. Six questions, multiple choice,
 * with a free-text "Something else" per question for anyone whose answer isn't on the list.
 *
 * The answers are a 1–5 value per trait: the tags on a profile and the match score on every role
 * are both derived from them, so the same six answers drive sign-up and a later retake.
 */
export type QuizState = { answers: (number | null)[]; other: string[] };

export const emptyQuiz = (from?: number[]): QuizState => ({ answers: from ? [...from] : WORK_STYLE_QUESTIONS.map(() => null), other: WORK_STYLE_QUESTIONS.map(() => "") });

export const quizComplete = (state: QuizState) => state.answers.every((a) => a !== null);

// The setter is passed straight in rather than a plain callback: two answers chosen in the same
// tick would otherwise both start from the same stale state and the first would be lost.
export function WorkStyleQuiz({ state, onChange }: { state: QuizState; onChange: Dispatch<SetStateAction<QuizState>> }) {
  /** Which questions have the free-text box open, so "Something else" behaves like an option. */
  const [showOther, setShowOther] = useState<boolean[]>(() => state.other.map((t) => t.trim() !== ""));

  const pick = (i: number, value: number) => onChange((prev) => ({ ...prev, answers: prev.answers.map((a, j) => (j === i ? value : a)) }));

  return (
    <div className="flex flex-col gap-5">
      {WORK_STYLE_QUESTIONS.map((q, i) => (
        <fieldset key={q.trait} className="flex flex-col gap-2">
          <legend className="flex flex-col gap-0.5 pb-1">
            <span className="text-[12px] leading-[1.3] font-semibold tracking-[0.4px] text-ink-2 uppercase">{q.trait}</span>
            <span className="text-[14px] leading-[1.4] font-medium text-ink">{q.question}</span>
          </legend>
          <div className="flex flex-col gap-2">
            {q.options.map((o) => {
              const chosen = state.answers[i] === o.value && !showOther[i];
              return (
                <button
                  key={o.label}
                  type="button"
                  aria-pressed={chosen}
                  onClick={() => {
                    setShowOther((s) => s.map((v, j) => (j === i ? false : v)));
                    onChange((prev) => ({ ...prev, answers: prev.answers.map((a, j) => (j === i ? o.value : a)), other: prev.other.map((t, j) => (j === i ? "" : t)) }));
                  }}
                  className={`flex h-11 items-center rounded-lg px-4 text-left text-[14px] leading-[1.3] ${chosen ? "bg-primary text-white" : "border border-border bg-white text-ink hover:bg-surface-alt"}`}
                >
                  {o.label}
                </button>
              );
            })}
            {/* OB-003 — the free-text option, scored in the middle and kept in the answer. */}
            <button
              type="button"
              aria-pressed={showOther[i]}
              onClick={() => {
                setShowOther((s) => s.map((v, j) => (j === i ? true : v)));
                pick(i, OTHER_VALUE);
              }}
              className={`flex h-11 items-center rounded-lg px-4 text-left text-[14px] leading-[1.3] ${showOther[i] ? "bg-ink text-white" : "border border-dashed border-border bg-white text-ink-2 hover:bg-surface-alt"}`}
            >
              Something else
            </button>
            {showOther[i] && (
              <Input
                value={state.other[i]}
                onChange={(e) => onChange((prev) => ({ ...prev, other: prev.other.map((t, j) => (j === i ? e.target.value : t)) }))}
                placeholder={`How do you actually handle ${q.trait.toLowerCase()}?`}
              />
            )}
          </div>
        </fieldset>
      ))}
    </div>
  );
}
