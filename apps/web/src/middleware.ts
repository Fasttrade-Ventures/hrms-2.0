import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_PREFIXES = ["/auth", "/"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return NextResponse.next();
  }

  // Auth gate placeholder — wire Supabase session in Phase 2 implementation
  const hasSession = request.cookies.has("hrms-session-stub");
  if (!hasSession && !pathname.startsWith("/auth")) {
    // Scaffold: allow all routes until Supabase auth is wired
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
