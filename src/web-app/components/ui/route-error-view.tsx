'use client';

import { useEffect } from 'react';

import { cn } from '@/web-app/lib/utils';

import { Button } from './button';

/**
 * Next 16.3 passes both `reset` and `retry` to error boundaries. `reset` only
 * re-renders the failed children; `retry` re-fetches them, which is what these
 * server-rendered routes actually need to recover.
 */
export type RouteErrorBoundaryProps = {
  error: Error & { digest?: string };
  retry: () => void;
};

type RouteErrorViewProps = RouteErrorBoundaryProps & {
  title: string;
  description: string;
  as?: 'div' | 'main';
  className?: string;
  buttonClassName?: string;
};

export function RouteErrorView({
  error,
  retry,
  title,
  description,
  as = 'div',
  className,
  buttonClassName,
}: RouteErrorViewProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const Component = as;

  return (
    <Component
      id={as === 'main' ? 'main-content' : undefined}
      className={cn('space-y-4 text-center', className)}
    >
      <h1 className="text-foreground text-xl font-semibold">{title}</h1>
      <p className="text-muted-foreground text-sm">{description}</p>
      <Button onClick={retry} variant="primary" className={buttonClassName}>
        Try again
      </Button>
    </Component>
  );
}
