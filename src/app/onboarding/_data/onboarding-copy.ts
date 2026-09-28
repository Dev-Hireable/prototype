import type { PublicSignupRole } from '@/web-app/lib/auth/auth-role-mapping';

/**
 * Role-specific onboarding copy. Kept beside the quiz script in `_data` so
 * wording changes never require touching a component.
 */
export type IntroCopy = {
  successImage: string;
  successAlt: string;
  successMessage: string;
  title: string;
  description: string;
  startLabel: string;
};

export type QuizCopy = {
  title: string;
  description: string;
};

export type ResultsCopy = {
  title: string;
  description: string;
  badgeAlt: string;
};

type OnboardingCopy = {
  intro: IntroCopy;
  quiz: QuizCopy;
  results: ResultsCopy;
};

const QUIZ_HEADER: QuizCopy = {
  title: 'Hireable Work Style Quiz',
  description:
    'Six quick scenarios. Pick one of the four answers, or type your own in Other.',
};

export const ONBOARDING_COPY: Record<PublicSignupRole, OnboardingCopy> = {
  client: {
    quiz: QUIZ_HEADER,
    intro: {
      successImage: '/images/employer-success.svg',
      successAlt: 'Account created successfully',
      successMessage:
        "Congratulations, your account has been created.\nLet's get you started.",
      title:
        'Hire a dedicated long-term partner, not a short-term professional.',
      description:
        "We'll ask a few questions to understand your preferred work style and start building your profile. It only takes less than 2 minutes.",
      startLabel: 'Start quiz',
    },
    results: {
      title: 'Your Hiring Style Profile',
      description:
        'These traits help us recommend Independents aligned with your communication and collaboration style.',
      badgeAlt: 'Hiring style profile illustration',
    },
  },
  talent: {
    quiz: QUIZ_HEADER,
    intro: {
      successImage: '/images/talent-success.svg',
      successAlt: 'Account verified successfully',
      successMessage:
        "Congratulations, your account has been verified.\nLet's get you started.",
      title: "Looking for a lasting match? You're in the right place.",
      description:
        'A few quick questions will help us tailor your profile and improve your matching with Team Builders.',
      startLabel: 'Start quiz',
    },
    results: {
      title: 'Your Work Style Profile',
      description:
        'These traits help match you with Team Builders who share a similar work style.',
      badgeAlt: 'Work style profile illustration',
    },
  },
};

/**
 * The welcome for someone retaking the quiz. The account isn't new, so there's no "account created"
 * celebration; they're welcomed back, shown the traits the quiz will replace, and the assistant
 * skips introducing itself again.
 */
export type RetakeCopy = {
  intro: IntroCopy;
  greeting: string;
};

export const RETAKE_TRAITS_LABEL = 'Your current traits';
export const RETAKE_KEEP_LABEL = 'Keep my current traits';

export const ONBOARDING_RETAKE_COPY: Record<PublicSignupRole, RetakeCopy> = {
  client: {
    intro: {
      successImage: '/images/employer-success.svg',
      successAlt: 'Welcome back',
      successMessage: "Welcome back.\nLet's see how you run your team today.",
      title: 'Has the way you run your team changed?',
      description:
        "Answer the same six scenarios again and we'll refresh your hiring style profile. Your current traits stay until you finish.",
      startLabel: 'Retake quiz',
    },
    greeting:
      'Good to see you again. Same six scenarios as last time, so answer for how you run your team today, not how you answered before. Ready?',
  },
  talent: {
    intro: {
      successImage: '/images/talent-success.svg',
      successAlt: 'Welcome back',
      successMessage: "Welcome back.\nLet's see how you work today.",
      title: 'Has the way you work changed?',
      description:
        "Answer the same six scenarios again and we'll refresh your work style profile. Your current traits stay until you finish.",
      startLabel: 'Retake quiz',
    },
    greeting:
      "Welcome back! Same six scenarios as last time. Answer for how you work today, not how you answered before. Let's do it.",
  },
};
