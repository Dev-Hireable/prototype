'use client';

import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import type { RefObject } from 'react';
import gsap from 'gsap';

import { prefersReducedMotion } from '@/web-app/lib/motion';

function buildComposerGradient(angle: number, intensity: number) {
  const warmAlpha = (0.03 + 0.11 * intensity).toFixed(3);
  const accentAlpha = (0.04 + 0.13 * intensity).toFixed(3);
  const tailAlpha = (0.02 + 0.09 * intensity).toFixed(3);

  return `linear-gradient(${angle}deg, rgba(255, 129, 18, ${warmAlpha}) 0%, rgba(251, 46, 111, ${accentAlpha}) 39%, rgba(255, 162, 96, ${warmAlpha}) 72%, rgba(229, 88, 161, ${tailAlpha}) 100%)`;
}

/**
 * The timeline is a side effect on a DOM node rather than React state, so it
 * needs its own teardown on unmount and on every question change; keeping that
 * lifecycle here leaves the component with two plain callbacks.
 */
export function useComposerGradient(
  composerShellRef: RefObject<HTMLFieldSetElement | null>,
  currentQuestionIndex: number,
) {
  const gradientTimelineRef = useRef<gsap.core.Timeline | null>(null);

  const stop = useCallback(() => {
    gradientTimelineRef.current?.kill();
    gradientTimelineRef.current = null;

    if (composerShellRef.current) {
      composerShellRef.current.style.background = 'none';
    }
  }, [composerShellRef]);

  const start = useCallback(() => {
    const composerShell = composerShellRef.current;
    if (!composerShell) return;

    stop();
    if (prefersReducedMotion()) return;

    const proxy = { angle: 90, intensity: 0 };
    gsap.set(composerShell, {
      background: buildComposerGradient(proxy.angle, proxy.intensity),
    });

    const timeline = gsap.timeline({
      onUpdate: () => {
        // The ref can point elsewhere by the time a frame lands; writing to a
        // detached shell would leak the gradient onto the next question.
        if (composerShellRef.current === composerShell) {
          composerShell.style.background = buildComposerGradient(
            proxy.angle,
            proxy.intensity,
          );
        }
      },
    });

    timeline
      .to(proxy, { intensity: 1, duration: 0.55, ease: 'power2.out' })
      .to(
        proxy,
        { angle: '+=360', duration: 8.6, ease: 'none', repeat: -1 },
        0,
      );

    gradientTimelineRef.current = timeline;
  }, [composerShellRef, stop]);

  useEffect(() => () => stop(), [stop]);

  useLayoutEffect(() => {
    stop();
  }, [currentQuestionIndex, stop]);

  return { start, stop };
}
