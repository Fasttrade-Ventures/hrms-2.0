import { type EmailOtpType } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { getPublicUrl, isSafeInternalPath } from "@/lib/auth/routes";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const requestedNext = searchParams.get("next") ?? "/";
  const next = isSafeInternalPath(requestedNext) ? requestedNext : "/";

  if (token_hash && type) {
    const supabase = await createClient();

    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    });

    if (!error) {
      return NextResponse.redirect(getPublicUrl(next, request));
    }
  }

  return NextResponse.redirect(getPublicUrl("/auth/login?error=auth_callback_failed", request));
}
