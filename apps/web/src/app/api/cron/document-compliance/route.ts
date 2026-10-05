import { authorizeCron } from "@/lib/cron/authorize";
import { NextResponse } from "next/server";

import { scanAndQueueDocumentComplianceNotifications } from "@/lib/hr/scan-document-compliance";
import { processNotificationOutbox } from "@/lib/notifications/process-outbox";

export async function GET(request: Request) {
  if (!authorizeCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const asOf = searchParams.get("asOf") || undefined;

  const queued = await scanAndQueueDocumentComplianceNotifications(asOf);
  const sent = await processNotificationOutbox(100);
  return NextResponse.json({ ok: true, queued, sent });
}
