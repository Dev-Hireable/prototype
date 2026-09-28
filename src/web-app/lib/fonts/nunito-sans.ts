import { Nunito_Sans } from 'next/font/google';

/**
 * The real app's third face, for its trait tags: the onboarding results screen and the talent
 * profile's Workplace Tags. Defined once here and imported where it is used, because every call
 * to a font function hosts another copy of the font (Next's "font definitions file").
 */
export const nunitoSans = Nunito_Sans({
  variable: '--font-nunito-sans',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
});
