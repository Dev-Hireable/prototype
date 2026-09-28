/**
 * Brand colours for JavaScript-side rendering: confetti, canvas, inline
 * gradients and the generated favicon. Tailwind-facing tokens live in
 * `app/globals.css` under `@theme`; these are the values that cannot be
 * expressed as a class name.
 */
export const BRAND_PINK = '#FB2E6F';
export const BRAND_MAGENTA = '#FF2FC5';
export const BRAND_ORANGE = '#FF8112';
export const BRAND_BLUE = '#00A7F8';

/** Quiz option accents. Deliberately a slightly different blue to BRAND_BLUE. */
const QUIZ_OPTION_BLUE = '#0097FF';
const QUIZ_OPTION_PURPLE = '#5865F2';

/** Gradient colour per option index, cycled. */
export const QUIZ_OPTION_GRADIENT_COLORS = [
  QUIZ_OPTION_BLUE,
  BRAND_ORANGE,
  BRAND_PINK,
  QUIZ_OPTION_PURPLE,
] as const;

/** Columns of the final quiz curtain transition, left to right. */
export const QUIZ_CURTAIN_COLORS = [
  BRAND_PINK,
  BRAND_ORANGE,
  BRAND_BLUE,
] as const;

export const ONBOARDING_CONFETTI_COLORS = [
  '#f43f5e',
  '#f97316',
  '#ec4899',
  '#3b82f6',
] as const;
