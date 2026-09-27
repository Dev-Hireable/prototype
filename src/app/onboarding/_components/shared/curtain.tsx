'use client';

import { useLayoutEffect, useRef } from 'react';
import gsap from 'gsap';

import { QUIZ_CURTAIN_COLORS } from '@/web-app/lib/brand-colors';

export type CurtainPhase = 'covering' | 'lifting';

/**
 * The curtain's motion: its columns sweep up from below the screen to cover it, then carry on up
 * off the top to lift. Returns the refs its columns attach to; the callbacks are read when each
 * sweep ends, so the latest ones run.
 */
function useCurtainSweep(
  phase: CurtainPhase,
  onCovered: () => void,
  onLifted: () => void,
) {
  const columnRefs = useRef<Array<HTMLDivElement | null>>([]);
  const onCoveredRef = useRef(onCovered);
  const onLiftedRef = useRef(onLifted);

  useLayoutEffect(() => {
    onCoveredRef.current = onCovered;
    onLiftedRef.current = onLifted;
  });

  useLayoutEffect(() => {
    const columns = columnRefs.current.filter(
      (column): column is HTMLDivElement => column !== null,
    );
    if (columns.length === 0) return;

    // A fromTo renders its start at once, in this layout effect, so the columns are below the
    // screen before the first paint. (A timeline's set() waits a frame: the old curtain showed
    // fully drawn for that frame. A CSS transform here instead gets read in as a pixel offset.)
    const tween =
      phase === 'covering'
        ? gsap.fromTo(
            columns,
            { yPercent: 100 },
            {
              yPercent: 0,
              duration: 0.45,
              stagger: 0.06,
              ease: 'power3.inOut',
              onComplete: () => onCoveredRef.current(),
            },
          )
        : gsap.to(columns, {
            yPercent: -100,
            duration: 0.5,
            stagger: 0.06,
            delay: 0.08,
            ease: 'power3.inOut',
            onComplete: () => onLiftedRef.current(),
          });
    return () => {
      tween.kill();
    };
  }, [phase]);

  return columnRefs;
}

/**
 * The brand curtain between the quiz and the results: three columns sweep up over the quiz's
 * wrap-up, the results mount behind them, and they carry on up to reveal the results already
 * coming in. It lives above both steps (the wizard owns it) so it can outlast the switch.
 *
 * It used to belong to the quiz and rise and leave again before the results existed, so it opened
 * onto a blank page; it also showed fully drawn for a frame before it started rising.
 */
export function OnboardingCurtain({
  phase,
  onCovered,
  onLifted,
}: {
  phase: CurtainPhase;
  onCovered: () => void;
  onLifted: () => void;
}) {
  const columnRefs = useCurtainSweep(phase, onCovered, onLifted);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-50 grid grid-cols-3 overflow-hidden"
    >
      {QUIZ_CURTAIN_COLORS.map((color, index) => (
        <div
          key={color}
          ref={(node) => {
            columnRefs.current[index] = node;
          }}
          className="h-full w-full"
          style={{ backgroundColor: color }}
        />
      ))}
    </div>
  );
}
