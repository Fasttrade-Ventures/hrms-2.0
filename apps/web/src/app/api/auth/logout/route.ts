import { NextResponse } from "next/server";

import { logAuthEvent } from "@/lib/audit/log-auth-event";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
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
  return NextResponse.redirect(new URL("/auth/login", request.url));
}

export async function GET(request: Request) {
  return POST(request);
}
