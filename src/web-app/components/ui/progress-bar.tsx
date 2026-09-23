import { cn } from '@/web-app/lib/utils';

const progressBarBase =
  'h-2 w-full appearance-none overflow-hidden rounded-r-full bg-neutral-subtle [&::-webkit-progress-bar]:bg-neutral-subtle [&::-webkit-progress-value]:rounded-r-full [&::-webkit-progress-value]:transition-[width] [&::-webkit-progress-value]:duration-300 [&::-moz-progress-bar]:rounded-r-full';

const progressBarFill =
  '[&::-webkit-progress-value]:bg-client [&::-moz-progress-bar]:bg-client';

type ProgressBarProps = {
  current: number;
  total: number;
  className?: string;
  ariaLabel?: string;
};

export function ProgressBar({
  current,
  total,
  className,
  ariaLabel = 'Onboarding progress',
}: ProgressBarProps) {
  const safeTotal = Math.max(total, 1);
  const safeCurrent = Math.min(safeTotal, Math.max(0, current));

  return (
    <progress
      className={cn(progressBarBase, progressBarFill, className)}
      value={safeCurrent}
      max={safeTotal}
      aria-label={ariaLabel}
    />
  );
}
