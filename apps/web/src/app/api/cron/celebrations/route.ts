import { authorizeCron } from "@/lib/cron/authorize";
import { NextResponse } from "next/server";

import { performCelebrations } from "@/lib/employees/celebrations-job";
import { processNotificationOutbox } from "@/lib/notifications/process-outbox";

export async function GET(request: Request) {
  if (!authorizeCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const asOf = new URL(request.url).searchParams.get("asOf") ?? undefined;
  const organizationId = new URL(request.url).searchParams.get("orgId") ?? undefined;
  const result = await performCelebrations({ asOfDate: asOf, organizationId });
  const notificationsSent = await processNotificationOutbox(50);
  return NextResponse.json({ ok: true, ...result, notificationsSent });
}
