'use client';

import * as React from 'react';
import { cn } from '@/web-app/lib/utils';
import { useGSAP } from '@gsap/react';

import { loadGsap, reportGsapLoadError } from '@/web-app/lib/load-gsap';
import { prefersReducedMotion } from '@/web-app/lib/motion';
import { HireableLoader } from './loading-screen-loader';

const loadingScreenBaseClassName =
  'flex flex-col items-center justify-center gap-4 z-50 transition-opacity duration-300 bg-background/80 backdrop-blur-sm';

interface LoadingScreenProps extends React.OutputHTMLAttributes<HTMLOutputElement> {
  fullscreen?: boolean;
  spinnerSize?: number;
  isLoading?: boolean;
  onExitComplete?: () => void;
}

export function LoadingScreen({
  className,
  fullscreen = true,
  spinnerSize = 80,
  isLoading = true,
  onExitComplete,
  ...props
}: LoadingScreenProps) {
  const containerRef = React.useRef<HTMLOutputElement>(null);
  const onExitCompleteRef = React.useRef(onExitComplete);
  const [shouldRender, setShouldRender] = React.useState(false);
  const isVisible = shouldRender || isLoading;

  React.useEffect(() => {
    onExitCompleteRef.current = onExitComplete;
  }, [onExitComplete]);

  useGSAP(
    () => {
      let cancelled = false;
      const finishWithoutAnimation = () => {
        if (cancelled) return;
        if (containerRef.current) {
          containerRef.current.style.opacity = isLoading ? '1' : '0';
        }
        setShouldRender(isLoading);
        if (!isLoading) {
          onExitCompleteRef.current?.();
        }
      };

      if (prefersReducedMotion()) {
        finishWithoutAnimation();
        return () => {
          cancelled = true;
        };
      }

      void loadGsap()
        .then(({ default: gsap }) => {
          if (cancelled || !containerRef.current) return;

          if (isLoading) {
            setShouldRender(true);
          }

          gsap.to(containerRef.current, {
            opacity: isLoading ? 1 : 0,
            duration: 0.3,
            ease: isLoading ? 'power2.out' : 'power2.in',
            onComplete: () => {
              if (cancelled || isLoading) return;
              setShouldRender(false);
              onExitCompleteRef.current?.();
            },
          });
        })
        .catch((error: unknown) => {
          reportGsapLoadError(error);
          finishWithoutAnimation();
        });

      return () => {
        cancelled = true;
      };
    },
    { dependencies: [isLoading], scope: containerRef },
  );

  if (!isVisible) return null;

  return (
    <output
      ref={containerRef}
      className={cn(
        loadingScreenBaseClassName,
        fullscreen ? 'fixed inset-0' : 'absolute inset-0',
        isLoading ? 'opacity-0' : 'opacity-100',
        className,
      )}
      aria-live="polite"
      aria-busy={isLoading}
      {...props}
    >
      <div
        style={{ width: spinnerSize, height: spinnerSize }}
        className="flex items-center justify-center"
      >
        <HireableLoader size={spinnerSize} />
      </div>
      <span className="sr-only">Loading…</span>
    </output>
  );
}
