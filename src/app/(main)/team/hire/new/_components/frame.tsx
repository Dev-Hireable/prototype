import type { ReactNode } from "react";
import { Meter } from "@/components/portal/meter";
import { Button, Card, Steps } from "@/components/portal/ui";
import { EditButton, EditPanel } from "@/components/portal/inline-edit";
import type { PathCopy } from "../_lib/wizard";

/**
 * The wizard's heading — the path's name, or the review's — and the steps under it. The path's one
 * line of intro is for step one; the steps after it don't repeat it.
 */
export function WizardHeader({ t, kind, step }: { t: PathCopy; kind: string; step: number }) {
  const review = kind === "review";
  const line = review ? "Check your role before you publish." : step === 0 ? t.intro : null;
  return (
    <>
      <div className="flex w-full max-w-[720px] flex-col gap-2 tracking-[0.2px]">
        {review ? (
          <h2 className="text-[20px] leading-[1.5] font-semibold tracking-[0.4px] text-ink">{t.reviewTitle}</h2>
        ) : (
          <h2 className="font-display text-[24px] leading-[1.5] font-semibold text-ink" style={{ fontVariationSettings: '"opsz" 14' }}>
            {t.title}
          </h2>
        )}
        {line && <p className="text-[14px] leading-[1.2] text-ink-2">{line}</p>}
      </div>
      <div className="w-full max-w-[720px] px-4 py-10 max-md:hidden">
        <Steps steps={[...t.steps]} current={step} />
      </div>
      <PhoneSteps steps={t.steps} current={step} />
    </>
  );
}

/**
 * A phone's stepper: where you are in words, over the bar the cards draw (Meter) filled to this
 * step. The row of discs had room for the open step's label alone, and five discs said little more.
 */
function PhoneSteps({ steps, current }: { steps: readonly string[]; current: number }) {
  const at = `Step ${current + 1} of ${steps.length}`;
  return (
    <div className="flex w-full flex-col gap-2 md:hidden">
      <p className="text-[13px] leading-[1.3] tracking-[0.2px] text-ink-2">
        {at} · <span className="font-semibold text-ink">{steps[current]}</span>
      </p>
      <Meter parts={[{ value: current + 1, color: "var(--color-primary)", label: "Done" }]} total={steps.length} label={`${at}: ${steps[current]}`} />
    </div>
  );
}

/**
 * A step's card, headed with the step's name. On a phone the stepper over it names the step already,
 * so the heading is left to screen readers, and a card with nothing else in its head (Trial tasks)
 * starts straight at its fields.
 */
export function StepCard({ title, body, bodySize = 14, action, children }: { title: string; /** A line under the heading; left out where the heading says it all. */ body?: string; bodySize?: 14 | 16; /** A button beside the heading, e.g. Use a template. */ action?: ReactNode; children: ReactNode }) {
  return (
    <Card className="flex w-full max-w-[720px] flex-col gap-10 rounded-2xl p-10 max-md:gap-6 max-md:p-5">
      <div className={`flex items-start justify-between gap-4 max-sm:flex-col max-sm:gap-3 ${body || action ? "" : "max-md:contents"}`}>
        <div className={`flex flex-col gap-1 ${body ? "" : "max-md:contents"}`}>
          <h3 className="text-[20px] leading-[1.5] font-semibold tracking-[0.4px] text-ink max-md:sr-only">{title}</h3>
          {body && <p className={`leading-[1.5] tracking-[0.2px] text-ink-2 ${bodySize === 16 ? "text-[16px]" : "text-[14px] leading-[1.2]"}`}>{body}</p>}
        </div>
        {action}
      </div>
      {children}
    </Card>
  );
}

/**
 * Save as draft and the next step. On a phone they stay pinned to the bottom of the screen while the
 * step scrolls under them, full width, so the next step is always under the thumb. The bar stops 1px
 * inside the card on every side, so the card's own outline still shows around it. With no tab bar
 * under this screen (isFocused), the bar keeps its buttons above the phone's home indicator.
 */
export function Cta({ next, disabled, onNext, onDraft }: { next: string; disabled: boolean; onNext: () => void; onDraft: () => void }) {
  return (
    <div className="flex items-center justify-end gap-3 max-md:sticky max-md:bottom-0 max-md:z-10 max-md:-mx-[19px] max-md:-mb-[19px] max-md:rounded-b-[15px] max-md:border-t max-md:border-border max-md:bg-white max-md:p-3 max-md:pb-[calc(0.75rem+env(safe-area-inset-bottom))] max-md:*:flex-1">
      <Button size="lg" className="!px-5" onClick={onDraft}>
        Save as draft
      </Button>
      <Button size="lg" variant="primary" className="!px-5" disabled={disabled} onClick={onNext}>
        {next}
      </Button>
    </div>
  );
}

/**
 * A Review line: the label, what was entered, and the pencil. A phone puts what was entered on a line
 * of its own under the label and its pencil: on one line the longer ones (the pay, a trial's length)
 * ran the pencil off the card.
 */
function Line({ label, value, onEdit, disabled }: { label: string; value?: ReactNode; onEdit: () => void; disabled?: boolean }) {
  return (
    <div className="flex items-center gap-2 text-[16px] leading-[1.5] tracking-[0.2px] whitespace-nowrap text-ink max-md:flex-wrap">
      <span className="font-semibold">{label}</span>
      {value && <span className="max-md:order-last max-md:basis-full max-md:whitespace-normal">{value}</span>}
      <EditButton label={label} onClick={onEdit} disabled={disabled} />
    </div>
  );
}

/** A Review section: its preview with a pencil, or — while editing — its fields with Cancel / Save. */
export function ReviewItem({
  label,
  value,
  heading,
  children,
  editor,
  error,
  editing,
  locked,
  canSave,
  onEdit,
  onSave,
  onCancel,
}: {
  label: string;
  value?: ReactNode;
  /** Replaces the label line in preview (the role title shows as the big heading). */
  heading?: ReactNode;
  children?: ReactNode;
  editor: ReactNode;
  /** Shown under the fields while editing, e.g. why Save is disabled. */
  error?: string | null;
  editing: boolean;
  locked: boolean;
  canSave: boolean;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  if (editing)
    return (
      <EditPanel label={label.replace(/:$/, "")} error={error} canSave={canSave} saveTip="This field can't be left empty" onSave={onSave} onCancel={onCancel}>
        {editor}
      </EditPanel>
    );
  return (
    <div className="flex flex-col gap-4">
      {heading ? (
        <div className="flex items-center gap-2">
          {heading}
          <EditButton label={label} onClick={onEdit} disabled={locked} />
        </div>
      ) : (
        <Line label={label} value={value} onEdit={onEdit} disabled={locked} />
      )}
      {children}
    </div>
  );
}
