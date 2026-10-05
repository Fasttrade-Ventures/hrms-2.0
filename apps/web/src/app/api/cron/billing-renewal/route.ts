import { authorizeCron } from "@/lib/cron/authorize";
import { NextResponse } from "next/server";

import { processBillingRenewals } from "@/lib/billing/dunning";
import { processNotificationOutbox } from "@/lib/notifications/process-outbox";

export async function GET(request: Request) {
  if (!authorizeCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await processBillingRenewals();
  const sent = await processNotificationOutbox(100);
  return NextResponse.json({ ok: true, ...result, sent });
}
