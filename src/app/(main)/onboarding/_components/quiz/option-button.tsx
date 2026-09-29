'use client';

import type { ButtonHTMLAttributes } from 'react';

import { QUIZ_OPTION_GRADIENT_COLORS } from '@/web-app/lib/brand-colors';
import { cn } from '@/web-app/lib/utils';

function getOptionGradient(index: number): string {
  return QUIZ_OPTION_GRADIENT_COLORS[
    index % QUIZ_OPTION_GRADIENT_COLORS.length
  ];
}

/** The reply arrow in its circle at the start of every option. Decorative. */
function OptionIcon() {
  return (
    <div
      className="relative z-10 flex size-10 shrink-0 flex-col items-center justify-center gap-2.5 rounded-[100px] bg-background/40 px-[11px]"
      aria-hidden
    >
      <svg
        width={20}
        height={20}
        viewBox="0 0 20 20"
        fill="none"
        className="text-muted-foreground"
        aria-hidden
      >
        <path
          d="M12.5 8.33L16.67 12.5L12.5 16.67"
          stroke="currentColor"
          strokeWidth="1.67"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M3.34 3.33V9.16C3.34 10.05 3.69 10.89 4.31 11.52C4.94 12.14 5.79 12.49 6.67 12.49H16.67"
          stroke="currentColor"
          strokeWidth="1.67"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

type OptionButtonProps = {
  label: string;
  selected?: boolean;
  /** Used for deterministic gradient/icon treatment (0-3). */
  optionIndex?: number;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'type'>;

export function OptionButton({
  label,
  selected = false,
  optionIndex = 0,
  onClick,
  className,
  ...props
}: OptionButtonProps) {
  const gradientColor = getOptionGradient(optionIndex);

  return (
    <button
      type="button"
      onClick={onClick}
      role="radio"
      aria-checked={selected}
      {...props}
      className={cn(
        'group relative isolate flex min-h-[58px] w-full flex-none cursor-pointer flex-row items-center gap-3 overflow-hidden rounded-[8px] bg-background px-3 py-2.5 transition-[border-color,box-shadow,transform,background-color] duration-300 ease-out focus-visible:ring-2 focus-visible:ring-border-focused focus-visible:ring-offset-2 active:translate-y-0 active:scale-100 disabled:cursor-not-allowed disabled:opacity-70 [WebkitTapHighlightColor:transparent] sm:px-4 sm:py-2',
        selected
          ? 'border border-border-hover shadow-md active:border-border-hover active:shadow-md'
          : 'border border-input shadow-sm hover:border-border-hover hover:shadow-md active:border-border-hover active:shadow-md',
        className,
      )}
    >
      <div
        className="pointer-events-none absolute -left-[132px] top-1/2 h-[58px] w-[167px] -translate-y-1/2 rounded-r-[100px] opacity-[0.16] blur-md transition-[left,width,opacity] duration-400 ease-out group-hover:-left-[96px] group-hover:w-[220px] group-hover:opacity-30 group-focus-visible:-left-[96px] group-focus-visible:w-[220px] group-focus-visible:opacity-30"
        style={{ backgroundColor: gradientColor }}
        aria-hidden
      />
      <OptionIcon />
      <div className="relative z-20 flex min-w-0 flex-1 flex-row items-center justify-center gap-[10px]">
        <span className="font-secondary wrap-break-word text-foreground w-full text-left text-[14px] font-normal leading-[125%] tracking-[0.2px]">
          {label}
        </span>
      </div>
    </button>
  );
}
