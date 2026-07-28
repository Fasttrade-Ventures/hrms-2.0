import { NextResponse } from "next/server";

import { withApiAuth } from "@/lib/api/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return withApiAuth(request, async ({ organizationId }) => {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("payroll_payruns")
      .select("id, period_label, period_year, period_month, status, locked_at")
      .eq("organization_id", organizationId)
      .eq("id", id)
      .maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ data });
  });
}
