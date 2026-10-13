import { NextResponse } from "next/server";

import { requireAuth } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  try {
    const session = await requireAuth();
    const body = await req.json();

    const { endpoint, keys, userAgent } = body;
    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return NextResponse.json({ error: "Invalid subscription payload." }, { status: 400 });
    }

    const admin = createAdminClient();
    const now = new Date().toISOString();

    const { error } = await admin.from("push_subscriptions").upsert(
      {
        organization_id: session.membership.organizationId,
        user_id: session.user.id,
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        user_agent: userAgent || null,
        updated_at: now,
      },
      {
        onConflict: "user_id,endpoint",
      },
    );

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unauthorized or failed." },
      { status: 401 },
    );
  }
}
