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
  "/auth/confirm",
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

export function isReportsPath(pathname: string): boolean {
  return pathname === "/hr/reports" || pathname.startsWith("/hr/reports/");
}

export function isAuditPath(pathname: string): boolean {
  return pathname === "/hr/audit" || pathname.startsWith("/hr/audit/") || pathname === "/auditor/audit" || pathname.startsWith("/auditor/audit/");
}

const SPECIALIST_PREFIXES: Record<string, string> = {
  recruiter: "/hr/recruitment",
  document_custodian: "/hr/documents",
  asset_manager: "/hr/assets",
};

function specialistPrefixAllowed(pathname: string, permissions: readonly string[]): boolean {
  return permissions.some((permission) => {
    const prefix = SPECIALIST_PREFIXES[permission];
    return Boolean(prefix && (pathname === prefix || pathname.startsWith(`${prefix}/`)));
  });
}

export function canAccessPath(
  pathname: string,
  roles: readonly string[],
  permissions: readonly string[] = [],
): boolean {
  if (isReportsPath(pathname) && permissions.includes("auditor")) {
    return true;
  }

  if (isAuditPath(pathname) && permissions.includes("auditor")) {
    return true;
  }

  if (pathname === "/auditor" || pathname.startsWith("/auditor/")) {
    return permissions.includes("auditor");
  }

  if (pathname === "/hr" || pathname.startsWith("/hr/")) {
    if (roles.includes("hr_administrator") || roles.includes("organization_owner")) {
      return true;
    }
    if (specialistPrefixAllowed(pathname, permissions)) {
      return true;
    }
    return false;
  }

  return canAccessPortal(pathname, roles);
}

export function isSafeInternalPath(path: string): boolean {
  if (!path.startsWith("/") || path.startsWith("//") || path.includes("\\")) return false;
  if (path.includes("://") || /[\u0000-\u001F\u007F]/.test(path)) return false;
  let decoded = path;
  try {
    decoded = decodeURIComponent(path);
  } catch {
    return false;
  }
  if (!decoded.startsWith("/") || decoded.startsWith("//") || decoded.includes("\\")) return false;
  if (decoded.includes("://")) return false;
  return true;
}

export function getPublicOrigin(request?: { headers?: { get(name: string): string | null }; url?: string } | Request): string {
  if (request?.headers?.get) {
    const forwardedProto = request.headers.get("x-forwarded-proto") || "https";
    const forwardedHost = request.headers.get("x-forwarded-host") || request.headers.get("host");

    if (forwardedHost && !forwardedHost.startsWith("0.0.0.0") && !forwardedHost.startsWith("127.0.0.1")) {
      return `${forwardedProto}://${forwardedHost}`;
    }
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (siteUrl && !siteUrl.includes("0.0.0.0")) {
    return siteUrl.replace(/\/+$/, "");
  }

  if (request && "url" in request && typeof request.url === "string") {
    try {
      const url = new URL(request.url);
      if (!url.hostname.startsWith("0.0.0.0")) {
        return url.origin;
      }
    } catch {
      // ignore
    }
  }

  return "http://localhost:3000";
}

export function getPublicUrl(path: string, request?: { headers?: { get(name: string): string | null }; url?: string } | Request): URL {
  const origin = getPublicOrigin(request);
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return new URL(cleanPath, origin);
}

