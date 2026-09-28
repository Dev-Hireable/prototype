import type { ButtonHTMLAttributes, ReactNode, Ref } from 'react';
import { InlineSpinner } from './inline-spinner';
import {
  getButtonClassName,
  type ButtonVariantProps,
} from './button-class-name';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  ButtonVariantProps & {
    ref?: Ref<HTMLButtonElement>;
    isLoading?: boolean;
    children: ReactNode;
  };

export function Button({
  variant = 'primary',
  size = 'default',
  isLoading = false,
  className,
  disabled,
  children,
  ref,
  type = 'button',
  ...props
}: ButtonProps) {
  const buttonClassName = getButtonClassName({ variant, size, className });

  return (
    <button
      ref={ref}
      type={type}
      className={buttonClassName}
      disabled={disabled || isLoading}
      aria-busy={isLoading || undefined}
      {...props}
    >
      {isLoading ? (
        <>
          <InlineSpinner className="size-4" />
          {children}
        </>
      ) : (
        children
      )}
    </button>
  );
}
