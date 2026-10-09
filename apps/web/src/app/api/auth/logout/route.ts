import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { logAuthEvent } from "@/lib/audit/log-auth-event";
import { getPublicUrl } from "@/lib/auth/routes";

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const loginUrl = getPublicUrl("/auth/login", request);
  // 303 See Other: after POST logout, the browser must GET /auth/login.
  // Default 307 preserves POST, which Next.js pages reject with HTTP 405.
  const response = NextResponse.redirect(loginUrl, 303);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    await logAuthEvent({
      action: "auth.logout",
      actorUserId: user.id,
      email: user.email,
    });
  }

  await supabase.auth.signOut();

  return response;
}

export async function GET(request: Request) {
  const site = request.headers.get("sec-fetch-site");
  if (site === "cross-site") {
    return NextResponse.redirect(getPublicUrl("/auth/login", request), 303);
  }
  return POST(request);
}
