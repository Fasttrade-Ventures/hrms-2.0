import { NextResponse, type NextRequest } from "next/server";
import type { User } from "@supabase/supabase-js";

import { dashboardPathForRoles } from "@/lib/auth/redirect";
import {
  canAccessPath,
  getPublicOrigin,
  isAuthEntryPath,
  isPublicAuthPath,
} from "@/lib/auth/routes";
import { createMiddlewareSupabaseClient } from "@/lib/supabase/create-middleware-client";

function redirectPublic(url: URL, request: NextRequest) {
  const origin = getPublicOrigin(request);
  const parsed = new URL(origin);
  url.protocol = parsed.protocol;
  url.host = parsed.host;
  url.port = parsed.port;
  return NextResponse.redirect(url);
}

/** Stay well under Vercel middleware invocation limits when Auth/DB is slow or unreachable. */
const AUTH_TIMEOUT_MS = 2_500;

function isPublicPath(pathname: string): boolean {
  if (pathname === "/") return true;
  if (pathname === "/api/health") return true;
  if (pathname.startsWith("/api/cron/")) return true;
  if (pathname.startsWith("/api/webhooks/")) return true;
  if (pathname.startsWith("/api/v1/")) return true;
  if (pathname === "/api/register") return true;
  if (pathname === "/api/auth/logout") return true;
  if (pathname === "/unauthorized") return true;
  if (isPublicAuthPath(pathname)) return true;
  return false;
}

/** Paths that must not wait on Supabase at all (no session refresh needed). */
function isAuthBypassPath(pathname: string): boolean {
  return (
    pathname === "/api/health" ||
    pathname.startsWith("/api/cron/") ||
    pathname.startsWith("/api/webhooks/")
  );
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      () => {
        clearTimeout(timer);
        resolve(null);
      },
    );
  });
}

type MembershipRow = {
  organization_id: string;
  roles: string[] | null;
  permissions: string[] | null;
};

type MiddlewareSupabase = ReturnType<typeof createMiddlewareSupabaseClient>["supabase"];

async function getMembership(
  supabase: MiddlewareSupabase,
  userId: string,
  request: NextRequest,
): Promise<{ roles: string[]; permissions: string[] } | null> {
  const deploymentMode = process.env.DEPLOYMENT_MODE ?? "standalone";
  const defaultOrgId = process.env.DEFAULT_ORGANIZATION_ID;
  const impersonateOrgId = request.cookies.get("hrms_impersonate_org_id")?.value;
  const activeOrgId = request.cookies.get("hrms_active_org_id")?.value;

  const result = await withTimeout<{ data: MembershipRow[] | null }>(
    Promise.resolve(
      supabase
        .from("organization_memberships")
        .select("organization_id, roles, permissions")
        .eq("user_id", userId),
    ),
    AUTH_TIMEOUT_MS,
  );
  if (!result) {
    return null;
  }

  const memberships = result.data ?? [];
  if (memberships.length === 0) {
    return { roles: [], permissions: [] };
  }

  const isPlatformAdmin = memberships.some((row) => row.roles?.includes("platform_administrator"));
  if (impersonateOrgId && isPlatformAdmin) {
    return {
      roles: ["organization_owner", "hr_administrator", "platform_administrator"],
      permissions: ["platform_impersonating"],
    };
  }

  let selected: MembershipRow | undefined;
  if (deploymentMode === "standalone" && defaultOrgId) {
    selected = memberships.find((row) => row.organization_id === defaultOrgId);
  } else if (activeOrgId) {
    selected = memberships.find((row) => row.organization_id === activeOrgId);
  }
  selected ??= memberships[0];

  if (!selected) {
    return { roles: [], permissions: [] };
  }

  return {
    roles: selected.roles ?? [],
    permissions: selected.permissions ?? [],
  };
}

async function getUserWithTimeout(
  supabase: MiddlewareSupabase,
): Promise<User | null> {
  const result = await withTimeout<{ data: { user: User | null } }>(
    supabase.auth.getUser(),
    AUTH_TIMEOUT_MS,
  );
  return result?.data.user ?? null;
}

export async function updateSession(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isAuthBypassPath(pathname)) {
    return NextResponse.next({ request });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    if (isPublicPath(pathname)) {
      return NextResponse.next({ request });
    }
    const url = request.nextUrl.clone();
    url.pathname = "/auth/login";
    if (pathname !== "/") {
      url.searchParams.set("next", pathname);
    }
    return redirectPublic(url, request);
  }

  let supabaseResponse = NextResponse.next({ request });

  const { supabase, getResponse } = createMiddlewareSupabaseClient(
    supabaseUrl,
    supabaseAnonKey,
    request,
    (response) => {
      supabaseResponse = response;
    },
    supabaseResponse,
  );

  // Timed auth lookup — never block the edge until Vercel kills the invocation.
  const user = await getUserWithTimeout(supabase);

  if (!user && pathname === "/auth/change-password") {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/login";
    url.searchParams.set("next", "/auth/change-password");
    return redirectPublic(url, request);
  }

  if (!user && !isPublicPath(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/login";
    if (pathname !== "/") {
      url.searchParams.set("next", pathname);
    }
    return redirectPublic(url, request);
  }

  if (user && isPublicAuthPath(pathname) && pathname !== "/auth/activate" && pathname !== "/auth/reset-password") {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return redirectPublic(url, request);
  }

  if (user && !isPublicPath(pathname) && !pathname.startsWith("/api/")) {
    const membership = await getMembership(supabase, user.id, request);

    // Auth/DB slow or down: fail closed so portal role checks are never skipped.
    // Timeout still avoids MIDDLEWARE_INVOCATION_TIMEOUT (redirect instead of waiting).
    if (!membership) {
      const url = request.nextUrl.clone();
      url.pathname = "/auth/login";
      url.searchParams.set("error", "session_check_timeout");
      return redirectPublic(url, request);
    }

    const { roles, permissions } = membership;

    if (roles.length === 0 && !isAuthEntryPath(pathname)) {
      const url = request.nextUrl.clone();
      url.pathname = "/auth/login";
      url.searchParams.set("error", "no_membership");
      return redirectPublic(url, request);
    }

    if (!canAccessPath(pathname, roles, permissions)) {
      const url = request.nextUrl.clone();
      url.pathname = "/unauthorized";
      url.searchParams.set("from", pathname);
      return redirectPublic(url, request);
    }
  }

  if (user && pathname === "/") {
    const membership = await getMembership(supabase, user.id, request);
    if (!membership) {
      const url = request.nextUrl.clone();
      url.pathname = "/auth/login";
      url.searchParams.set("error", "session_check_timeout");
      return redirectPublic(url, request);
    }
    const url = request.nextUrl.clone();
    url.pathname = dashboardPathForRoles(membership.roles);
    url.search = "";
    return redirectPublic(url, request);
  }

  return getResponse();
}
