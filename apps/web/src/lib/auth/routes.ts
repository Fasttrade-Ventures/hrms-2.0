import type { SystemRole } from "@hrms/domain";

export type PortalPrefix = {
  prefix: string;
  roles: readonly SystemRole[];
};

/** Route prefixes and the membership roles allowed to access them. */
export const PORTAL_PREFIXES: readonly PortalPrefix[] = [
  { prefix: "/employee", roles: ["employee"] },
  { prefix: "/manager", roles: ["manager"] },
  { prefix: "/branch-admin", roles: ["branch_admin"] },
  { prefix: "/hr", roles: ["hr_administrator"] },
  { prefix: "/director", roles: ["director"] },
  { prefix: "/owner", roles: ["organization_owner"] },
  { prefix: "/platform", roles: ["platform_administrator"] },
] as const;

const PUBLIC_AUTH_EXACT = new Set([
  "/auth/login",
  "/auth/forgot-password",
  "/auth/reset-password",
  "/auth/activate",
  "/auth/register",
]);

export function isPublicAuthPath(pathname: string): boolean {
  if (PUBLIC_AUTH_EXACT.has(pathname)) {
    return true;
  }

  return pathname.startsWith("/auth/callback");
}

export function isAuthEntryPath(pathname: string): boolean {
  return (
    PUBLIC_AUTH_EXACT.has(pathname) ||
    pathname === "/auth/change-password" ||
    pathname.startsWith("/auth/callback")
  );
}

export function getPortalRolesForPath(pathname: string): readonly SystemRole[] | null {
  for (const portal of PORTAL_PREFIXES) {
    if (pathname === portal.prefix || pathname.startsWith(`${portal.prefix}/`)) {
      return portal.roles;
    }
  }

  return null;
}

export function canAccessPortal(
  pathname: string,
  userRoles: readonly string[],
): boolean {
  const requiredRoles = getPortalRolesForPath(pathname);

  if (!requiredRoles) {
    return true;
  }

  return requiredRoles.some((role) => userRoles.includes(role));
}

export function isSafeInternalPath(path: string): boolean {
  return path.startsWith("/") && !path.startsWith("//") && !path.includes("\\");
}
