import { authorizeCron } from "@/lib/cron/authorize";
import { NextResponse } from "next/server";

import { performProbationReminders } from "@/lib/employees/probation";
import { processNotificationOutbox } from "@/lib/notifications/process-outbox";

export async function GET(request: Request) {
  if (!authorizeCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const asOf = searchParams.get("asOf") || undefined;
  const orgId = searchParams.get("orgId") || undefined;
  const dryRun = searchParams.get("dryRun") === "true";

  const result = await performProbationReminders({
    asOfDate: asOf,
    organizationId: orgId,
    dryRun,
  });
  const notificationsSent = await processNotificationOutbox(50);

  return NextResponse.json({
    ok: true,
    ...result,
    notificationsSent,
  });
}

export const POST = GET;
