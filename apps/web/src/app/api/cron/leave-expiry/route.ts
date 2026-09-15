import { NextResponse } from "next/server";

import { expireOverduePendingLeaves } from "@/lib/leave/expiry";
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

  const result = await expireOverduePendingLeaves({ asOfDate: asOf });
  const sent = await processNotificationOutbox(50);

  return NextResponse.json({
    ok: true,
    ...result,
    notificationsSent: sent,
  });
}
