import { NextResponse } from "next/server";

import { requireAuth } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  try {
    const session = await requireAuth();
    const body = await req.json();

    const { endpoint } = body;
    if (!endpoint) {
      return NextResponse.json({ error: "Missing endpoint." }, { status: 400 });
    }

    const admin = createAdminClient();
    const { error } = await admin
      .from("push_subscriptions")
      .delete()
      .eq("user_id", session.user.id)
      .eq("endpoint", endpoint);

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
