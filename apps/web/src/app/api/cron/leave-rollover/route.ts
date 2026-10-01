import { NextResponse } from "next/server";
import { performYearEndCarryForward, performCarryForwardExpiry } from "@/lib/leave/rollover";
import { processNotificationOutbox } from "@/lib/notifications/process-outbox";

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
  const yearParam = searchParams.get("targetYear");
  const targetYear = yearParam ? Number(yearParam) : undefined;
  const dryRun = searchParams.get("dryRun") === "true";
  const mode = searchParams.get("mode") || "all"; // 'rollover' | 'expiry' | 'all'

  const startMs = Date.now();
  let carryForwardResult = null;
  let expiryResult = null;

  if (mode === "all" || mode === "rollover") {
    carryForwardResult = await performYearEndCarryForward({
      targetYear,
      organizationId: orgId,
      dryRun,
    });
  }

  if (mode === "all" || mode === "expiry") {
    expiryResult = await performCarryForwardExpiry({
      asOfDate: asOf,
      organizationId: orgId,
      dryRun,
    });
  }

  const notificationsSent = await processNotificationOutbox(50);
  const elapsedMs = Date.now() - startMs;

  return NextResponse.json({
    ok: true,
    carryForward: carryForwardResult,
    expiry: expiryResult,
    notificationsSent,
    elapsedMs,
  });
}

export const POST = GET;
