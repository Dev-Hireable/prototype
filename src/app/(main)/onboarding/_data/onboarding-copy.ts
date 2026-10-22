import type { PublicSignupRole } from '@/web-app/lib/auth/auth-role-mapping';

/**
 * Role-specific onboarding copy. Kept beside the quiz script in `_data` so
 * wording changes never require touching a component.
 */
export type IntroCopy = {
  /** The mascot heading the intro, and what it says to a screen reader. */
  successImage: string;
  successAlt: string;
  title: string;
  description: string;
  startLabel: string;
};

export type QuizCopy = {
  title: string;
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
};

export const ONBOARDING_COPY: Record<PublicSignupRole, OnboardingCopy> = {
  client: {
    quiz: QUIZ_HEADER,
    intro: {
      successImage: '/images/employer-success.svg',
      successAlt: 'Hireable mascot celebrating your new account',
      title: 'Your account is ready.',
      description:
        "Answer a few quick questions about how you like to work. We'll use them to recommend Independents who match your style. It takes about two minutes.",
      startLabel: 'Start quiz',
    },
    results: {
      title: 'Your Work Style Profile',
      description:
        'These tags help us recommend Independents aligned with your communication and collaboration style.',
      badgeAlt: 'Work style profile illustration',
    },
  },
  talent: {
    quiz: QUIZ_HEADER,
    intro: {
      successImage: '/images/talent-success.svg',
      successAlt: 'Hireable mascot celebrating your new account',
      title: 'Your account is ready.',
      description:
        "Answer a few quick questions about how you like to work. We'll use them to recommend you to Team Builders who match your style. It takes about two minutes.",
      startLabel: 'Start quiz',
    },
    results: {
      title: 'Your Work Style Profile',
      description:
        'These tags help match you with Team Builders who share a similar work style.',
      badgeAlt: 'Work style profile illustration',
    },
  },
};

/**
 * The welcome for someone retaking the quiz. The account isn't new, so there's no confetti;
 * they're welcomed back, shown the tags the quiz will replace, and the assistant skips
 * introducing itself again. The quiz can be retaken once a year, and the copy says so. The quiz's
 * results are called tags wherever the reader sees them, as on the profile.
 */
export type RetakeCopy = {
  intro: IntroCopy;
  greeting: string;
};

export const RETAKE_TAGS_LABEL = 'Your current tags';
export const RETAKE_KEEP_LABEL = 'Keep my current tags';

export const ONBOARDING_RETAKE_COPY: Record<PublicSignupRole, RetakeCopy> = {
  client: {
    intro: {
      successImage: '/images/employer-success.svg',
      successAlt: 'Hireable mascot welcoming you back',
      title: 'Welcome back.',
      description:
        'Retake the work style quiz to refine your Independent recommendations. Your current tags stay until you finish. You can retake once a year.',
      startLabel: 'Retake quiz',
    },
    greeting:
      'Welcome back. Retake the quiz so your Independent recommendations reflect how you run your team today. Are you ready?',
  },
  talent: {
    intro: {
      successImage: '/images/talent-success.svg',
      successAlt: 'Hireable mascot welcoming you back',
      title: 'Welcome back.',
      description:
        'Retake the work style quiz to keep your profile current and get yourself recommended to teams that fit how you work. Your current tags stay until you finish. You can retake once a year.',
      startLabel: 'Retake quiz',
    },
    greeting:
      'Welcome back. Retake the quiz so your Team Builder recommendations reflect how you work today. Are you ready?',
  },
};
