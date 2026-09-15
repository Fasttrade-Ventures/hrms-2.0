import { NextResponse } from "next/server";
import { performAutoClockOut } from "@/lib/attendance/auto-clock-out";

function authorizeCron(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true; // allow in local dev if no secret configured
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!authorizeCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const asOf = searchParams.get("asOf") || undefined;
  const orgId = searchParams.get("orgId") || undefined;
  const bufferParam = searchParams.get("bufferMinutes");
  const bufferMinutes = bufferParam !== null ? Number(bufferParam) : undefined;

  const startMs = Date.now();
  const result = await performAutoClockOut({
    asOf,
    organizationId: orgId,
    bufferMinutes,
  });
  const elapsedMs = Date.now() - startMs;

  return NextResponse.json({
    ok: true,
    ...result,
    elapsedMs,
  });
}

export const POST = GET;
