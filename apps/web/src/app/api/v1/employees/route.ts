import { NextResponse } from "next/server";

import { parsePagination, withApiAuth } from "@/lib/api/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  return withApiAuth(request, async ({ organizationId }) => {
    const url = new URL(request.url);
    const { page, pageSize, offset } = parsePagination(url);
    const admin = createAdminClient();

    const { data, error, count } = await admin
      .from("employees")
      .select("id, employee_number, full_name, email, status, join_date, branch_id, department_id", {
        count: "exact",
      })
      .eq("organization_id", organizationId)
      .order("employee_number")
      .range(offset, offset + pageSize - 1);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({
      data: data ?? [],
      page,
      pageSize,
      total: count ?? 0,
    });
  });
}
