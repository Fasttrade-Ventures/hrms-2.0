import { NextResponse } from "next/server";

import { logAuthEvent } from "@/lib/audit/log-auth-event";
import { resolvePostLoginPath } from "@/lib/auth/redirect";
import { canAccessPortal, getPublicOrigin, isSafeInternalPath } from "@/lib/auth/routes";
import { getMembershipRoles } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const origin = getPublicOrigin(request);
  const code = searchParams.get("code");
  const next = searchParams.get("next");

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      await logAuthEvent({
        action: "auth.callback.succeeded",
        actorUserId: data.user.id,
        email: data.user.email,
        metadata: { next: next ?? null },
      });

      let destination = await resolvePostLoginPath(supabase);

      if (next && isSafeInternalPath(next)) {
        const roles = await getMembershipRoles(data.user.id);
        if (canAccessPortal(next, roles)) {
          destination = next;
        }
      }

      return NextResponse.redirect(`${origin}${destination}`);
    }

    await logAuthEvent({
      action: "auth.callback.failed",
      metadata: { reason: error?.message ?? "missing_session" },
    });
  }

  return NextResponse.redirect(`${origin}/auth/login?error=auth_callback_failed`);
}
