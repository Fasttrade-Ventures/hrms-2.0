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
    const { data: payrun } = await admin
      .from("payroll_payruns")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("id", id)
      .maybeSingle();

    if (!payrun) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const { data, error } = await admin
      .from("payroll_payrun_items")
      .select("id, employee_id, gross_pay, net_pay, epf_employee, socso_employee, eis_employee, pcb")
      .eq("payrun_id", id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data: data ?? [] });
  });
}
