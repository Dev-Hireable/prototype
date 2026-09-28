import { cn } from '@/web-app/lib/utils';

const buttonBaseClassName =
  'font-secondary inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg font-bold cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focused disabled:pointer-events-none disabled:cursor-not-allowed';

const buttonVariantClassNames = {
  primary:
    'bg-client text-white hover:bg-client-hover active:bg-client-active disabled:bg-neutral-300 disabled:text-neutral-500',
  destructive:
    'bg-danger text-white hover:bg-red-600 active:bg-red-600 disabled:bg-neutral-300 disabled:text-neutral-500',
  tertiary:
    'border border-neutral-400 bg-background text-neutral-850 hover:bg-surface-hover active:bg-surface-hover disabled:bg-background disabled:text-neutral-500',
} as const;

const buttonSizeClassNames = {
  default: 'h-[50px] px-5 text-sm',
  lg: 'h-[56px] px-6 text-base',
  sm: 'h-9 px-3 py-2 text-xs',
} as const;

type ButtonVariant = keyof typeof buttonVariantClassNames;
type ButtonSize = keyof typeof buttonSizeClassNames;

export type ButtonVariantProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

export function getButtonClassName({
  variant = 'primary',
  size = 'default',
  className,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
} = {}) {
  return cn(
    buttonBaseClassName,
    buttonVariantClassNames[variant],
    buttonSizeClassNames[size],
    className,
  );
}
