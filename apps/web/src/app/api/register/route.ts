import { isSaasMode } from "@hrms/platform";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import { provisionTenant } from "@/lib/platform/provision-tenant";

export async function POST(request: Request) {
  if (!isSaasMode()) {
    return NextResponse.json({ error: "Registration is disabled in standalone mode." }, { status: 403 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: "Server configuration error." }, { status: 500 });
  }

  const body = (await request.json()) as {
    company?: string;
    fullName?: string;
    email?: string;
    password?: string;
  };

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    const result = await provisionTenant(admin, {
      company: body.company ?? "",
      fullName: body.fullName ?? "",
      email: body.email ?? "",
      password: body.password ?? "",
    });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Registration failed.";
    const status = message.includes("required") || message.includes("Password") ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
