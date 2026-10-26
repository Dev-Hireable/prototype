import type { PublicSignupRole } from '@/web-app/lib/auth/auth-role-mapping';

/** The wordmark over every step after the intro. */
export const ONBOARDING_WORDMARK_SRC = '/Logo-name.svg';

/** Each side's mascot: the intro's picture and the quiz assistant's avatar. */
export const ONBOARDING_MASCOT_SRC = {
  client: '/images/employer-success.svg',
  talent: '/images/talent-success.svg',
} as const satisfies Record<PublicSignupRole, string>;
