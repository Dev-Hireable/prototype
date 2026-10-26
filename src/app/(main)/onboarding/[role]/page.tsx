import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { preload } from 'react-dom';

import { OnboardingWizard } from '../_components/onboarding-wizard';
import {
  ONBOARDING_MASCOT_SRC,
  ONBOARDING_WORDMARK_SRC,
} from '../_data/onboarding-assets';
import { localQuizQuestions } from '../_lib/local-quiz';
import { asPublicSignupRole } from '@/web-app/lib/auth/auth-routes';
import {
  PUBLIC_SIGNUP_ROLES,
  type PublicSignupRole,
} from '@/web-app/lib/auth/auth-role-mapping';
import { quizTagMetadata } from '@/web-app/lib/workstyle/tag-metadata';

type PageProps = {
  params: Promise<{ role: string }>;
};

/** The browser tab's title, named for the user type each onboarding is for. */
const TAB_TITLE: Record<PublicSignupRole, string> = {
  client: 'Team Builder onboarding',
  talent: 'Independent onboarding',
};

/**
 * Only the public signup roles onboard, so the router answers any other role
 * with a real 404 before rendering starts.
 */
export const dynamicParams = false;

export function generateStaticParams() {
  return PUBLIC_SIGNUP_ROLES.map((role) => ({ role }));
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { role } = await params;
  const parsedRole = asPublicSignupRole(role);

  return {
    title: parsedRole ? TAB_TITLE[parsedRole] : 'Onboarding',
    description:
      'Complete your quiz to finish your Hireable onboarding and continue to your dashboard.',
  };
}

/**
 * The real app's onboarding page, without its session checks (the prototype has no sign-in to
 * check) and with the questions read from the quiz script instead of the backend.
 */
export default async function OnboardingPage({ params }: PageProps) {
  const { role } = await params;
  const parsedRole = asPublicSignupRole(role);

  if (!parsedRole) {
    notFound();
  }

  // The steps sit hidden behind the splash, and a hidden <img> doesn't load: fetch the pictures
  // with the page instead, so they're there the moment the splash lifts.
  preload(ONBOARDING_MASCOT_SRC[parsedRole], { as: 'image' });
  preload(ONBOARDING_WORDMARK_SRC, { as: 'image' });

  return (
    <OnboardingWizard
      role={parsedRole}
      initialQuizQuestions={localQuizQuestions(parsedRole)}
      initialTagMetadata={quizTagMetadata}
    />
  );
}
