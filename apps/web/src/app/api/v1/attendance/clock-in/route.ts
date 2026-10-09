import { NextResponse } from "next/server";

import { clockInFromApi, parseAttendanceTarget } from "@/lib/api/attendance";
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
        const data = await clockInFromApi(organizationId, parseAttendanceTarget(body));
        return NextResponse.json({ data }, { status: 201 });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to clock in.";
        const status = message === "Already clocked in." ? 409 : message === "Active employee not found." ? 404 : 400;
        return NextResponse.json({ error: message }, { status });
      }
    },
    { scope: "attendance:clock" },
  );
}
