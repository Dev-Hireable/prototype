import { cn } from '@/web-app/lib/utils';
import type { WorkstyleDimension } from '@/web-app/lib/workstyle/dimensions';
import {
  getTraitIcon,
  getTraitVariantByQuestionIndex,
} from '@/web-app/lib/workstyle/results-traits';
import type { QuizTagMetadata } from '@/web-app/lib/workstyle/tag-metadata';
import * as React from 'react';
import { Icon } from './icon';

const worktraitTagBaseClassName =
  'inline-flex flex-row items-center justify-center rounded-full';

// Typed as a total record so adding a work-style dimension fails the build
// here instead of silently rendering an unstyled tag.
const worktraitTagVariantClassNames: Record<WorkstyleDimension, string> = {
  'decision-making': 'bg-worktrait-decision',
  adaptability: 'bg-worktrait-adapt',
  responsiveness: 'bg-worktrait-response',
  'time-management': 'bg-worktrait-time',
  cooperativeness: 'bg-worktrait-coop',
  communication: 'bg-worktrait-comm',
};

const worktraitTagSizeClassNames = {
  sm: 'h-6 px-2 gap-1 text-[10px]',
  md: 'h-7 px-2.5 gap-1.5 text-xs',
  lg: 'h-8 px-3 gap-1.5 text-sm',
} as const;

type WorktraitTagVariant = WorkstyleDimension;
type WorktraitTagSize = keyof typeof worktraitTagSizeClassNames;

interface WorktraitTagProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: WorktraitTagVariant;
  size?: WorktraitTagSize;
  icon?: React.ReactNode;
  label: string;
}

function WorktraitTag({
  className,
  variant = 'decision-making',
  size = 'md',
  icon,
  label,
  ...props
}: WorktraitTagProps) {
  return (
    <div
      className={cn(
        worktraitTagBaseClassName,
        worktraitTagVariantClassNames[variant],
        worktraitTagSizeClassNames[size],
        className,
      )}
      {...props}
    >
      {icon && (
        <span className="text-foreground flex shrink-0 items-center justify-center">
          {icon}
        </span>
      )}
      <span className="font-nunito text-foreground leading-none font-semibold tracking-wide uppercase">
        {label}
      </span>
    </div>
  );
}

type WorkstyleTraitTagProps = {
  label: string;
  /** Position of the answered question; picks the fallback dimension when the
   *  metadata has no entry for this tag. */
  questionIndex: number;
  tagMetadata?: QuizTagMetadata | null;
  size?: WorktraitTagSize;
};

/** A `WorktraitTag` that derives its colour variant and icon from the tag
 *  itself, so every surface showing saved work-style tags renders them alike. */
function WorkstyleTraitTag({
  label,
  questionIndex,
  tagMetadata,
  size = 'md',
}: WorkstyleTraitTagProps) {
  return (
    <WorktraitTag
      variant={getTraitVariantByQuestionIndex(
        label,
        questionIndex,
        tagMetadata,
      )}
      size={size}
      label={label}
      icon={<Icon icon={getTraitIcon(label)} size={16} />}
    />
  );
}

export { WorkstyleTraitTag };
