import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { dashboardPathForRoles } from "@/lib/auth/redirect";
import {
  canAccessPortal,
  isAuthEntryPath,
  isPublicAuthPath,
} from "@/lib/auth/routes";

function isPublicPath(pathname: string): boolean {
  if (pathname === "/") return true;
  if (pathname === "/api/health") return true;
  if (pathname === "/api/auth/logout") return true;
  if (pathname === "/unauthorized") return true;
  if (isPublicAuthPath(pathname)) return true;
  return false;
}

async function getMembershipRoles(
  supabase: ReturnType<typeof createServerClient>,
  userId: string,
): Promise<string[]> {
  const defaultOrgId = process.env.DEFAULT_ORGANIZATION_ID;

  let query = supabase.from("organization_memberships").select("roles").eq("user_id", userId);

  if (defaultOrgId) {
    query = query.eq("organization_id", defaultOrgId);
  }

  const { data } = await query.maybeSingle();
  return data?.roles ?? [];
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
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
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

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
    const roles = await getMembershipRoles(supabase, user.id);

    if (roles.length === 0 && !isAuthEntryPath(pathname)) {
      const url = request.nextUrl.clone();
      url.pathname = "/auth/login";
      url.searchParams.set("error", "no_membership");
      return NextResponse.redirect(url);
    }

    if (!canAccessPortal(pathname, roles)) {
      const url = request.nextUrl.clone();
      url.pathname = "/unauthorized";
      url.searchParams.set("from", pathname);
      return NextResponse.redirect(url);
    }
  }

  if (user && pathname === "/") {
    const roles = await getMembershipRoles(supabase, user.id);
    const url = request.nextUrl.clone();
    url.pathname = dashboardPathForRoles(roles);
    url.search = "";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
