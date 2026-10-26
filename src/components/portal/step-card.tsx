import type { ReactNode } from "react";
import { Card } from "@/components/portal/ui";

/**
 * A wizard step's card, the same on the talent's proposal and the Team Builder's new role (its steps
 * and its review): roomy, a size down on a phone. With `title` it's headed by the step's name, marked
 * when what it asks for is `required`; a card with a head of its own puts a StepHeading in it instead.
 * `tight` keeps its sections closer (a short card with a note under its one item).
 */
export function StepCard({ title, required = false, tight = false, className = "", children }: { title?: string; required?: boolean; tight?: boolean; className?: string; children: ReactNode }) {
  return (
    <Card className={`flex flex-col p-10 max-md:gap-6 max-md:p-5 ${tight ? "gap-6" : "gap-10"} ${className}`}>
      {title !== undefined && <StepHeading required={required}>{title}</StepHeading>}
      {children}
    </Card>
  );
}

/** A step card's heading; `className` can hide it on a phone, where the stepper over it names the step already. */
export function StepHeading({ required = false, className = "", children }: { required?: boolean; className?: string; children: ReactNode }) {
  return (
    <h3 className={`text-[20px] leading-[1.5] font-semibold tracking-[0.4px] text-ink ${className}`}>
      {children}
      {required && (
        <span aria-hidden className="text-danger">
          {" *"}
        </span>
      )}
    </h3>
  );
}
