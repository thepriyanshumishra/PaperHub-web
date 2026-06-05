export const ROLES = {
  STUDENT: 'student',
  VERIFIER: 'verifier',
  MODERATOR: 'moderator',
  ADMIN: 'admin',
} as const;

export type Role = typeof ROLES[keyof typeof ROLES];

const ROLE_HIERARCHY: Record<Role, number> = {
  [ROLES.STUDENT]: 0,
  [ROLES.VERIFIER]: 1,
  [ROLES.MODERATOR]: 2,
  [ROLES.ADMIN]: 3,
};

export function hasPermission(userRole: Role, requiredRole: Role): boolean {
  // Defensive checks in case of invalid roles
  if (!userRole || !(userRole in ROLE_HIERARCHY)) return false;
  if (!requiredRole || !(requiredRole in ROLE_HIERARCHY)) return false;
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}
