import { NextResponse } from "next/server";

import { withApiAuth } from "@/lib/api/auth";
import { staffApiErrorStatus, submitOvertimeFromApi } from "@/lib/api/staff-requests";

export async function POST(request: Request) {
  return withApiAuth(
    request,
    async ({ organizationId }) => {
      const body = (await request.json().catch(() => ({}))) as {
        employeeNumber?: string;
        email?: string;
        workDate?: string;
        hours?: number;
        rateType?: string;
        reason?: string;
      };
      try {
        const data = await submitOvertimeFromApi(organizationId, body);
        return NextResponse.json({ data }, { status: 201 });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to submit overtime.";
        return NextResponse.json({ error: message }, { status: staffApiErrorStatus(message) });
      }
    },
    { scope: "staff:self" },
  );
}
