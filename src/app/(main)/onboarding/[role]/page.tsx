import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { OnboardingWizard } from '../_components/onboarding-wizard';
import { localQuizQuestions } from '../_lib/local-quiz';
import { asPublicSignupRole } from '@/web-app/lib/auth/auth-routes';
import { PUBLIC_SIGNUP_ROLES } from '@/web-app/lib/auth/auth-role-mapping';
import { quizTagMetadata } from '@/web-app/lib/workstyle/tag-metadata';

type PageProps = {
  params: Promise<{ role: string }>;
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
    title: `${
      parsedRole
        ? parsedRole.charAt(0).toUpperCase() + parsedRole.slice(1)
        : 'Account'
    } Onboarding`,
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

  return (
    <OnboardingWizard
      role={parsedRole}
      initialQuizQuestions={localQuizQuestions(parsedRole)}
      initialTagMetadata={quizTagMetadata}
    />
  );
}
