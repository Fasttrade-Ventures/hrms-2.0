import { NextResponse } from "next/server";

import { listAttendanceFromApi } from "@/lib/api/attendance";
import { withApiAuth } from "@/lib/api/auth";

export async function GET(request: Request) {
  return withApiAuth(
    request,
    async ({ organizationId }) => {
      const date = new URL(request.url).searchParams.get("date") ?? undefined;
      try {
        const data = await listAttendanceFromApi(organizationId, date);
        return NextResponse.json({ data });
      } catch (error) {
        return NextResponse.json(
          { error: error instanceof Error ? error.message : "Failed to list attendance." },
          { status: 500 },
        );
      }
    },
    { scope: "attendance:clock" },
  );
}
