import { NextResponse } from "next/server";

import { withApiAuth } from "@/lib/api/auth";
import { cancelLeaveFromApi, staffApiErrorStatus } from "@/lib/api/staff-requests";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  return withApiAuth(
    request,
    async ({ organizationId }) => {
      const body = (await request.json().catch(() => ({}))) as { reason?: string };
      try {
        const data = await cancelLeaveFromApi(organizationId, id, body.reason);
        return NextResponse.json({ data });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to cancel leave.";
        return NextResponse.json({ error: message }, { status: staffApiErrorStatus(message) });
      }
    },
    { scope: "staff:self" },
  );
}
