import * as React from 'react';
import { cn } from '@/web-app/lib/utils';
import { materialSymbolsFont } from '@/web-app/lib/fonts/material-symbols';
import {
  getMaterialSymbolGlyph,
  type MaterialSymbolName,
} from '@/web-app/lib/icons/material-symbol-names';

const MATERIAL_SYMBOLS_MIN_OPSZ = 20;
const MATERIAL_SYMBOLS_MAX_OPSZ = 48;

type IconSize = 14 | 16 | 20 | 24 | 40 | 48;

interface IconProps extends React.HTMLAttributes<HTMLSpanElement> {
  ref?: React.Ref<HTMLSpanElement>;
  /**
   * Restricted to the glyphs subset into the bundled font; anything else would
   * render an empty box. See `lib/icons/material-symbol-names.json`.
   */
  icon: MaterialSymbolName;
  size?: IconSize;
  filled?: boolean;
  weight?: 100 | 200 | 300 | 400 | 500 | 600 | 700;
  decorative?: boolean;
}
function Icon({
  icon,
  size = 24,
  filled = false,
  weight = 400,
  decorative = true,
  className,
  style,
  ref,
  ...props
}: IconProps) {
  const opticalSize = Math.min(
    MATERIAL_SYMBOLS_MAX_OPSZ,
    Math.max(MATERIAL_SYMBOLS_MIN_OPSZ, size),
  );

  return (
    <span
      ref={ref}
      className={cn(
        materialSymbolsFont.className,
        'inline-block shrink-0 leading-none whitespace-nowrap normal-case select-none',
        className,
      )}
      style={{
        fontSize: size,
        fontVariationSettings: `'FILL' ${filled ? 1 : 0}, 'wght' ${weight}, 'GRAD' 0, 'opsz' ${opticalSize}`,
        ...style,
      }}
      aria-hidden={decorative}
      {...props}
    >
      {getMaterialSymbolGlyph(icon)}
    </span>
  );
}

export { Icon };
