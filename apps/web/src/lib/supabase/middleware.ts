import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { User } from "@supabase/supabase-js";

import { dashboardPathForRoles } from "@/lib/auth/redirect";
import {
  canAccessPath,
  isAuthEntryPath,
  isPublicAuthPath,
} from "@/lib/auth/routes";

/** Stay well under Vercel middleware invocation limits when Auth/DB is slow or unreachable. */
const AUTH_TIMEOUT_MS = 2_500;

function isPublicPath(pathname: string): boolean {
  if (pathname === "/") return true;
  if (pathname === "/api/health") return true;
  if (pathname.startsWith("/api/cron/")) return true;
  if (pathname === "/api/auth/logout") return true;
  if (pathname === "/unauthorized") return true;
  if (isPublicAuthPath(pathname)) return true;
  return false;
}

/** Paths that must not wait on Supabase at all (no session refresh needed). */
function isAuthBypassPath(pathname: string): boolean {
  return pathname === "/api/health" || pathname.startsWith("/api/cron/");
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
  roles: string[] | null;
  permissions: string[] | null;
};

async function getMembership(
  supabase: ReturnType<typeof createServerClient>,
  userId: string,
): Promise<{ roles: string[]; permissions: string[] } | null> {
  const defaultOrgId = process.env.DEFAULT_ORGANIZATION_ID;

  let query = supabase
    .from("organization_memberships")
    .select("roles, permissions")
    .eq("user_id", userId);

  if (defaultOrgId) {
    query = query.eq("organization_id", defaultOrgId);
  }

  const result = await withTimeout<{ data: MembershipRow | null }>(
    Promise.resolve(query.maybeSingle()),
    AUTH_TIMEOUT_MS,
  );
  if (!result) {
    return null;
  }

  const { data } = result;
  return {
    roles: data?.roles ?? [],
    permissions: data?.permissions ?? [],
  };
}

async function getUserWithTimeout(
  supabase: ReturnType<typeof createServerClient>,
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
    return NextResponse.redirect(url);
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          supabaseResponse.cookies.set(name, value, options);
        });
      },
    },
  });

  // Timed auth lookup — never block the edge until Vercel kills the invocation.
  const user = await getUserWithTimeout(supabase);

  if (!user && pathname === "/auth/change-password") {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/login";
    url.searchParams.set("next", "/auth/change-password");
    return NextResponse.redirect(url);
  }

  if (!user && !isPublicPath(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/login";
    if (pathname !== "/") {
      url.searchParams.set("next", pathname);
    }
    return NextResponse.redirect(url);
  }

  if (user && isPublicAuthPath(pathname) && pathname !== "/auth/activate" && pathname !== "/auth/reset-password") {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (user && !isPublicPath(pathname) && !pathname.startsWith("/api/")) {
    const membership = await getMembership(supabase, user.id);

    // Auth/DB slow or down: fail closed so portal role checks are never skipped.
    // Timeout still avoids MIDDLEWARE_INVOCATION_TIMEOUT (redirect instead of waiting).
    if (!membership) {
      const url = request.nextUrl.clone();
      url.pathname = "/auth/login";
      url.searchParams.set("error", "session_check_timeout");
      return NextResponse.redirect(url);
    }

    const { roles, permissions } = membership;

    if (roles.length === 0 && !isAuthEntryPath(pathname)) {
      const url = request.nextUrl.clone();
      url.pathname = "/auth/login";
      url.searchParams.set("error", "no_membership");
      return NextResponse.redirect(url);
    }

    if (!canAccessPath(pathname, roles, permissions)) {
      const url = request.nextUrl.clone();
      url.pathname = "/unauthorized";
      url.searchParams.set("from", pathname);
      return NextResponse.redirect(url);
    }
  }

  if (user && pathname === "/") {
    const membership = await getMembership(supabase, user.id);
    if (!membership) {
      const url = request.nextUrl.clone();
      url.pathname = "/auth/login";
      url.searchParams.set("error", "session_check_timeout");
      return NextResponse.redirect(url);
    }
    const url = request.nextUrl.clone();
    url.pathname = dashboardPathForRoles(membership.roles);
    url.search = "";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
