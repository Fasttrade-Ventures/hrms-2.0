import { authorizeCron } from "@/lib/cron/authorize";
import { NextResponse } from "next/server";

import { dispatchDueReportSubscriptions } from "@/lib/reports/subscriptions";
import { processNotificationOutbox } from "@/lib/notifications/process-outbox";

export async function GET(request: Request) {
  if (!authorizeCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const queued = await dispatchDueReportSubscriptions();
  const sent = await processNotificationOutbox(100);
  return NextResponse.json({ ok: true, queued, sent });
}
