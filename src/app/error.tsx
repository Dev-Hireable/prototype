'use client';

import {
  RouteErrorView,
  type RouteErrorBoundaryProps,
} from '@/web-app/components/ui/route-error-view';

export default function Error({ error, retry }: RouteErrorBoundaryProps) {
  return (
    <RouteErrorView
      error={error}
      retry={retry}
      as="main"
      title="Something went wrong"
      description="An unexpected error occurred. Please try again."
      className="flex min-h-screen flex-col items-center justify-center px-4"
    />
  );
}
