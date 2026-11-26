import { NextResponse } from "next/server";

import { parsePagination, withApiAuth } from "@/lib/api/auth";
import { createEmployeeFromApi, employeeApiErrorStatus } from "@/lib/api/employee-create";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  return withApiAuth(
    request,
    async ({ organizationId }) => {
      const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
      if (!body || typeof body !== "object" || Array.isArray(body)) {
        return NextResponse.json({ error: "Request body must be a JSON object." }, { status: 400 });
      }
      try {
        const created = await createEmployeeFromApi(organizationId, body);
        return NextResponse.json(
          {
            data: {
              id: created.employeeId,
              employeeNumber: created.employeeNumber,
              activationEmailSent: created.activationEmailSent,
            },
          },
          { status: 201 },
        );
      } catch (error) {
        const status = employeeApiErrorStatus(error);
        if (status === 500) console.error("Create employee API error", error);
        const message =
          status === 500 ? "Failed to create employee." : (error as Error).message;
        return NextResponse.json({ error: message }, { status });
      }
    },
    { scope: "employees:write" },
  );
}

export async function GET(request: Request) {
  return withApiAuth(
    request,
    async ({ organizationId }) => {
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
    },
    { scope: "employees:read" },
  );
}
