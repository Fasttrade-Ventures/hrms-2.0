import { NextResponse } from "next/server";

import { withApiAuth } from "@/lib/api/auth";
import { staffApiErrorStatus, submitClaimFromApi } from "@/lib/api/staff-requests";

export async function POST(request: Request) {
  return withApiAuth(
    request,
    async ({ organizationId }) => {
      const body = (await request.json().catch(() => ({}))) as {
        employeeNumber?: string;
        email?: string;
        claimTypeId?: string;
        amount?: number | string;
        receiptDate?: string;
        description?: string;
        distanceKm?: number;
        origin?: string;
        destination?: string;
      };
      try {
        const data = await submitClaimFromApi(organizationId, body);
        return NextResponse.json({ data }, { status: 201 });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to submit claim.";
        return NextResponse.json({ error: message }, { status: staffApiErrorStatus(message) });
      }
    },
    { scope: "staff:self" },
  );
}
