const AUTH_ROLES = ['client', 'talent', 'admin'] as const;
export const PUBLIC_SIGNUP_ROLES = ['client', 'talent'] as const;

export type AuthRole = (typeof AUTH_ROLES)[number];
export type PublicSignupRole = (typeof PUBLIC_SIGNUP_ROLES)[number];

export function isAuthRole(value: string): value is AuthRole {
  return AUTH_ROLES.includes(value as AuthRole);
}

export function isPublicSignupRole(value: string): value is PublicSignupRole {
  return PUBLIC_SIGNUP_ROLES.includes(value as PublicSignupRole);
}

export type GraphqlAuthRole = 'admin' | 'employer' | 'talent';
export type GraphqlSignupRole = Exclude<GraphqlAuthRole, 'admin'>;

export function fromGraphqlAuthRole(value: unknown): AuthRole | null {
  if (value === 'employer') {
    return 'client';
  }

  if (typeof value === 'string' && isAuthRole(value)) {
    return value;
  }

  return null;
}

export function toGraphqlSignupRole(role: PublicSignupRole): GraphqlSignupRole {
  return role === 'client' ? 'employer' : 'talent';
}
