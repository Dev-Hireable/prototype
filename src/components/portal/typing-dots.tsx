import type { Ref } from "react";

/** The bubble's colour in each chat: the writer's own. */
const TONE = {
  /** The quiz's assistant (Hiro, Hira): their light blue. */
  assistant: "bg-accent-bg",
  /** The quiz's user: their grey. */
  user: "bg-muted",
  /** The other side in Messages and the quick chat: their white bubble with its edge. */
  message: "bg-white outline -outline-offset-1 outline-line",
} as const;

/**
 * Someone writing a message: three dots in a small bubble of the writer's colour, each rising and
 * brightening in turn (`.typing-dot` in globals.css). One design for every chat: the quiz's
 * assistant and user, and the other side in Messages and the quick chat. It comes in with a quick
 * rise, unless `bubbleRef` animates it in instead (the quiz's own entrance). Without motion the dots
 * stay still. With `label` it's a status, so a screen reader hears who's typing.
 */
export function TypingDots({ tone, label, bubbleRef }: { tone: keyof typeof TONE; label?: string; bubbleRef?: Ref<HTMLDivElement> }) {
  return (
    <div ref={bubbleRef} role={label ? "status" : undefined} aria-hidden={label ? undefined : true} className={`relative h-[22px] w-[42px] flex-none rounded-[8px] ${TONE[tone]} ${bubbleRef ? "" : "typing-in"}`}>
      {label && <span className="sr-only">{label}</span>}
      <span aria-hidden className="typing-dot absolute top-2 left-2 size-1.5 rounded-full bg-neutral-muted" />
      <span aria-hidden className="typing-dot absolute top-2 left-4.5 size-1.5 rounded-full bg-neutral-muted" />
      <span aria-hidden className="typing-dot absolute top-2 left-7 size-1.5 rounded-full bg-neutral-muted" />
    </div>
  );
}
