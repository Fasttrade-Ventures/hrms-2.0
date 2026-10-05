import { authorizeCron } from "@/lib/cron/authorize";
import { NextResponse } from "next/server";
import { performTardinessAlertSweep } from "@/lib/attendance/tardiness-alert";

export async function GET(request: Request) {
  if (!authorizeCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const asOf = searchParams.get("asOf") || undefined;
  const orgId = searchParams.get("orgId") || undefined;

  const startMs = Date.now();
  const result = await performTardinessAlertSweep({
    asOf,
    organizationId: orgId,
  });
  const elapsedMs = Date.now() - startMs;

  return NextResponse.json({
    ok: true,
    ...result,
    elapsedMs,
  });
}

export const POST = GET;
