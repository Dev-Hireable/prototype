'use client';
import * as React from 'react';
import { preload } from 'react-dom';
import { useGSAP } from '@gsap/react';
import { cn } from '@/web-app/lib/utils';
import { loadGsap, reportGsapLoadError } from '@/web-app/lib/load-gsap';
import { prefersReducedMotion } from '@/web-app/lib/motion';
const LOADER_BASE_WIDTH = 124.92;
const LOADER_BASE_HEIGHT = 124.21;
type LoaderPart = {
  key: 'rose' | 'pink' | 'orange' | 'blue';
  style: React.CSSProperties;
};

const LOADER_PARTS: readonly LoaderPart[] = [
  {
    key: 'rose',
    style: {
      width: '36.96px',
      height: '124.17px',
      left: '0px',
      top: '0px',
      backgroundImage: 'url(/loader/rose.svg)',
      backgroundSize: '100% 100%',
      backgroundRepeat: 'no-repeat',
      clipPath: 'inset(100% 0 0 0)',
    },
  },
  {
    key: 'pink',
    style: {
      width: '36.96px',
      height: '54.4px',
      left: '44px',
      top: '0px',
      backgroundImage: 'url(/loader/pink.svg)',
      backgroundSize: '100% 100%',
      backgroundRepeat: 'no-repeat',
      clipPath: 'inset(0 0 100% 0)',
    },
  },
  {
    key: 'orange',
    style: {
      width: '36.96px',
      height: '63.21px',
      left: '44px',
      top: '61px',
      backgroundImage: 'url(/loader/orange.svg)',
      backgroundSize: '100% 100%',
      backgroundRepeat: 'no-repeat',
      clipPath: 'inset(0 0 100% 0)',
    },
  },
  {
    key: 'blue',
    style: {
      width: '37px',
      height: '89px',
      left: '87.94px',
      top: '35px',
      backgroundImage: 'url(/loader/blue.svg)',
      backgroundSize: '100% 100%',
      backgroundRepeat: 'no-repeat',
      clipPath: 'inset(0 0 100% 0)',
      transform: 'scaleY(-1)',
    },
  },
];
type LoaderPartKey = (typeof LOADER_PARTS)[number]['key'];
const loaderSrc = (key: LoaderPartKey) => `/loader/${key}.svg`;

/** How long the draw waits for its SVGs, in ms; a stalled request plays it over whatever has arrived. */
const DECODE_WAIT_MS = 2000;

/**
 * Resolves once every part's SVG is decoded, so the draw never plays over empty boxes, or after
 * DECODE_WAIT_MS: a request that never answers leaves decode() pending for good.
 */
function decodeLoaderParts(): Promise<unknown> {
  const decoded = Promise.all(
    LOADER_PARTS.map(({ key }) => {
      const image = new Image();
      image.src = loaderSrc(key);
      return image.decode().catch(() => undefined);
    }),
  );
  return Promise.race([
    decoded,
    new Promise((resolve) => setTimeout(resolve, DECODE_WAIT_MS)),
  ]);
}

export function HireableLoader({
  className,
  size = 80,
  onCycle,
}: {
  className?: string;
  size?: number;
  /**
   * Called once, when the logo has played its first full cycle: drawn in, held, and drawn back out
   * (at once with reduced motion, which shows the logo at rest).
   */
  onCycle?: () => void;
}) {
  // CSS background images only load once the parts are laid out; ask for them with the HTML instead.
  for (const { key } of LOADER_PARTS) {
    preload(loaderSrc(key), { as: 'image', fetchPriority: 'high' });
  }
  const onCycleRef = React.useRef(onCycle);
  React.useEffect(() => {
    onCycleRef.current = onCycle;
  }, [onCycle]);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const partRefs = React.useRef<Record<LoaderPartKey, HTMLDivElement | null>>({
    rose: null,
    pink: null,
    orange: null,
    blue: null,
  });
  const scale = size / LOADER_BASE_WIDTH;
  useGSAP(
    () => {
      let cancelled = false;
      let killTimeline: (() => void) | null = null;
      let cycled = false;
      const reportCycle = () => {
        if (cancelled || cycled) return;
        cycled = true;
        onCycleRef.current?.();
      };
      void Promise.all([loadGsap(), decodeLoaderParts()])
        .then(([{ default: gsap }]) => {
          if (cancelled || !containerRef.current) {
            return;
          }
          const [rose, ...remainingParts] = LOADER_PARTS.map(
            ({ key }) => partRefs.current[key],
          );
          if (!rose || remainingParts.some((part) => !part)) {
            return;
          }
          if (prefersReducedMotion()) {
            gsap.set(rose, { clipPath: 'inset(0% 0 0 0)' });
            gsap.set(remainingParts, { clipPath: 'inset(0 0 0% 0)' });
            reportCycle();
            return;
          }
          // The first repeat is the draw back out (yoyo); it ends when the playhead is back at 0.
          let drawingOut = false;
          const timeline = gsap.timeline({
            repeat: -1,
            repeatDelay: 0.5,
            yoyo: true,
            defaults: { duration: 0.6, ease: 'power2.inOut' },
            onRepeat: () => {
              drawingOut = true;
            },
            onUpdate: () => {
              if (drawingOut && timeline.time() <= 0) reportCycle();
            },
          });
          killTimeline = () => timeline.kill();
          timeline
            .set([rose], { clipPath: 'inset(100% 0 0 0)' })
            .set(remainingParts, { clipPath: 'inset(0 0 100% 0)' });
          timeline.to(rose, { clipPath: 'inset(0% 0 0 0)' });
          remainingParts.forEach((part) => {
            timeline.to(part, { clipPath: 'inset(0 0 0% 0)' }, '-=0.2');
          });
        })
        .catch((error: unknown) => {
          reportGsapLoadError(error);
          reportCycle();
        });
      return () => {
        cancelled = true;
        killTimeline?.();
      };
    },
    { scope: containerRef },
  );
  return (
    <div
      ref={containerRef}
      className={cn('relative shrink-0', className)}
      style={{
        width: LOADER_BASE_WIDTH,
        height: LOADER_BASE_HEIGHT,
        transform: `scale(${scale})`,
        transformOrigin: 'center center',
      }}
      aria-hidden="true"
    >
      {LOADER_PARTS.map((part) => (
        <div
          key={part.key}
          ref={(node) => {
            partRefs.current[part.key] = node;
          }}
          className="absolute"
          style={part.style}
        />
      ))}
    </div>
  );
}
