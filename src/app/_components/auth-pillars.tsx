import Image from 'next/image';

import { cn } from '@/web-app/lib/utils';

/**
 * The real app's app/_components/auth-pillars.tsx, with only the corner pillars
 * the 404 page draws: the sign-in pages here draw their own sidebar (AuthShell).
 */
const AUTH_PILLARS_IMAGE_PATH = '/auth-pillars.svg';

const PILLARS_SIZES = '480px';

const PILLARS_SCALE_OBJECT = 'scale-[1.01] object-contain';

const CORNER_PILLARS_IMAGE_CLASS = cn(
  PILLARS_SCALE_OBJECT,
  'transform-[translateZ(0)]',
);

/** Mirrored corner pillars for full-page surfaces (e.g. 404). */
export function AuthPillarsCorners() {
  return (
    <>
      <div className="pointer-events-none absolute -top-12.5 -left-12.5 h-75.25 w-120 overflow-hidden">
        <Image
          src={AUTH_PILLARS_IMAGE_PATH}
          alt=""
          fill
          sizes={PILLARS_SIZES}
          loading="eager"
          unoptimized
          className={cn(CORNER_PILLARS_IMAGE_CLASS, 'rotate-180')}
          draggable={false}
        />
      </div>
      <div className="pointer-events-none absolute -right-12.5 -bottom-12.5 h-75.25 w-120 overflow-hidden">
        <Image
          src={AUTH_PILLARS_IMAGE_PATH}
          alt=""
          fill
          sizes={PILLARS_SIZES}
          loading="eager"
          unoptimized
          className={CORNER_PILLARS_IMAGE_CLASS}
          draggable={false}
        />
      </div>
    </>
  );
}
