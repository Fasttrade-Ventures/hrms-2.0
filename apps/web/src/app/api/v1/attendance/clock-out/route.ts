import { NextResponse } from "next/server";

import { clockOutFromApi, parseAttendanceTarget } from "@/lib/api/attendance";
import { withApiAuth } from "@/lib/api/auth";

export async function POST(request: Request) {
  return withApiAuth(
    request,
    async ({ organizationId }) => {
      const body = (await request.json().catch(() => ({}))) as {
        employeeNumber?: string;
        email?: string;
      };
      try {
        const data = await clockOutFromApi(organizationId, parseAttendanceTarget(body));
        return NextResponse.json({ data });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to clock out.";
        const status = message === "Not clocked in." ? 409 : message === "Active employee not found." ? 404 : 400;
        return NextResponse.json({ error: message }, { status });
      }
    },
    { scope: "attendance:clock" },
  );
}
