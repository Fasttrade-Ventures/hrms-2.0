import { NextResponse } from "next/server";

import { escalateOverdueApprovalSteps } from "@/lib/approvals/escalation";
import { authorizeCron } from "@/lib/cron/authorize";
import { processNotificationOutbox } from "@/lib/notifications/process-outbox";

export async function GET(request: Request) {
  if (!authorizeCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const asOf = searchParams.get("asOf") || undefined;
  const orgId = searchParams.get("orgId") || undefined;

  const result = await escalateOverdueApprovalSteps({
    asOfDate: asOf,
    organizationId: orgId,
  });

  const notificationsSent = await processNotificationOutbox(50);

  return NextResponse.json({
    ok: true,
    ...result,
    notificationsSent,
  });
}

export const POST = GET;
