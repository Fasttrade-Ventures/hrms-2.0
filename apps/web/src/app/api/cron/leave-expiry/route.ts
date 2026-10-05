import { authorizeCron } from "@/lib/cron/authorize";
import { NextResponse } from "next/server";

import { expireOverduePendingLeaves } from "@/lib/leave/expiry";
import { processNotificationOutbox } from "@/lib/notifications/process-outbox";

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
