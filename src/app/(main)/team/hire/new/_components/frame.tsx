import type { ReactNode } from "react";
import { Button, Card, Steps } from "@/components/portal/ui";
import { EditButton, EditPanel } from "@/components/portal/inline-edit";
import type { PathCopy } from "../_lib/wizard";

/** The wizard's heading — the path's name, or the review's — and the steps under it. */
export function WizardHeader({ t, kind, step }: { t: PathCopy; kind: string; step: number }) {
  const review = kind === "review";
  return (
    <>
      <div className="flex w-[720px] flex-col gap-2 tracking-[0.2px]">
        {review ? (
          <h2 className="text-[20px] leading-[1.5] font-semibold tracking-[0.4px] text-ink">{t.reviewTitle}</h2>
        ) : (
          <h2 className="font-display text-[24px] leading-[1.5] font-semibold text-ink" style={{ fontVariationSettings: '"opsz" 14' }}>
            {t.title}
          </h2>
        )}
        <p className="text-[14px] leading-[1.2] text-ink-2">{review ? "This is how your role will appear to Independents." : t.intro}</p>
      </div>
      <div className="w-[720px] px-4 py-10">
        <Steps steps={[...t.steps]} current={step} />
      </div>
    </>
  );
}

export function StepCard({ title, body, bodySize = 14, action, children }: { title: string; body: string; bodySize?: 14 | 16; /** A button beside the heading, e.g. Use a template. */ action?: ReactNode; children: ReactNode }) {
  return (
    <Card className="flex w-[720px] flex-col gap-10 rounded-2xl p-10">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h3 className="text-[20px] leading-[1.5] font-semibold tracking-[0.4px] text-ink">{title}</h3>
          <p className={`leading-[1.5] tracking-[0.2px] text-ink-2 ${bodySize === 16 ? "text-[16px]" : "text-[14px] leading-[1.2]"}`}>{body}</p>
        </div>
        {action}
      </div>
      {children}
    </Card>
  );
}

export function Cta({ next, disabled, onNext, onDraft }: { next: string; disabled: boolean; onNext: () => void; onDraft: () => void }) {
  return (
    <div className="flex items-center justify-end gap-3">
      <Button size="lg" className="!px-5" onClick={onDraft}>
        Save as draft
      </Button>
      <Button size="lg" variant="primary" className="!px-5" disabled={disabled} onClick={onNext}>
        {next}
      </Button>
    </div>
  );
}

function Line({ label, value, onEdit, disabled }: { label: string; value?: ReactNode; onEdit: () => void; disabled?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <span className="flex items-center gap-2 text-[16px] leading-[1.5] tracking-[0.2px] whitespace-nowrap text-ink">
        <span className="font-semibold">{label}</span>
        {value && <span>{value}</span>}
      </span>
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
