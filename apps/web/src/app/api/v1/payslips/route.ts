import { NextResponse } from "next/server";

import { withApiAuth } from "@/lib/api/auth";
import { payslipsFromApi, staffApiErrorStatus } from "@/lib/api/staff-requests";

export async function GET(request: Request) {
  return withApiAuth(
    request,
    async ({ organizationId }) => {
      const url = new URL(request.url);
      try {
        const data = await payslipsFromApi(organizationId, {
          employeeNumber: url.searchParams.get("employeeNumber") ?? undefined,
          email: url.searchParams.get("email") ?? undefined,
        });
        return NextResponse.json({ data });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to load payslips.";
        return NextResponse.json({ error: message }, { status: staffApiErrorStatus(message) });
      }
    },
    { scope: "staff:self" },
  );
}
