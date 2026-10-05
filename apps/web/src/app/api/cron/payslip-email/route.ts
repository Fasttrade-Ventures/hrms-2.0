import { authorizeCron } from "@/lib/cron/authorize";
import { NextResponse } from "next/server";

import { runPayslipEmailJob } from "@/lib/payroll/jobs/payslip-email";
import { processNotificationOutbox } from "@/lib/notifications/process-outbox";

/** Queue payslip emails for pay_date = today (MYT) or asOf query parameter and flush the email outbox. */
export async function GET(request: Request) {
  if (!authorizeCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const asOf = searchParams.get("asOf") ?? new Date().toISOString().slice(0, 10);
  const queued = await runPayslipEmailJob(asOf);
  const delivered = await processNotificationOutbox();

  return NextResponse.json({ ok: true, asOf, queued, delivered });
}
