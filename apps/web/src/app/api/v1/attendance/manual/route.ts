import { NextResponse } from "next/server";

import { withApiAuth } from "@/lib/api/auth";
import { staffApiErrorStatus, submitManualAttendanceFromApi } from "@/lib/api/staff-requests";

export async function POST(request: Request) {
  return withApiAuth(
    request,
    async ({ organizationId }) => {
      const body = (await request.json().catch(() => ({}))) as {
        employeeNumber?: string;
        email?: string;
        requestDate?: string;
        clockInTime?: string;
        clockOutTime?: string;
        reason?: string;
      };
      try {
        const data = await submitManualAttendanceFromApi(organizationId, body);
        return NextResponse.json({ data }, { status: 201 });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to submit manual attendance.";
        return NextResponse.json({ error: message }, { status: staffApiErrorStatus(message) });
      }
    },
    { scope: "staff:self" },
  );
}
