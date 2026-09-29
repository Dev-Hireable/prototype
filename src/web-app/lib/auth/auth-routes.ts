import {
  isPublicSignupRole,
  type AuthRole,
  type PublicSignupRole,
} from './auth-role-mapping';

/**
 * The real app's auth routes, cut down to what the onboarding quiz and the 404 page call. The
 * prototype has no sessions: each role's dashboard is its portal, and the quiz lives at
 * /onboarding/<role>.
 */
const DASHBOARD_PATHS: Record<AuthRole, string> = {
  client: '/team',
  talent: '/independent',
  admin: '/admin',
};

export function asPublicSignupRole(
  role: string | undefined,
): PublicSignupRole | null {
  return role && isPublicSignupRole(role) ? role : null;
}

export function getOnboardingPath(role: PublicSignupRole): string {
  return `/onboarding/${role}`;
}

export function getDashboardPath(role: AuthRole): string {
  return DASHBOARD_PATHS[role];
}

export function getLoginPath(): string {
  return '/login';
}
