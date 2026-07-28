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
      .from("employees")
      .select("id, employee_number, full_name, email, status, join_date, branch_id, department_id, job_title")
      .eq("organization_id", organizationId)
      .eq("id", id)
      .maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ data });
  });
}
