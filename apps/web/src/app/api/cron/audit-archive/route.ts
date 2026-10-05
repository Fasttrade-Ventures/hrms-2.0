import { authorizeCron } from "@/lib/cron/authorize";
import { NextResponse } from "next/server";

import { runAuditArchiveJob } from "@/lib/audit/jobs/archive";

/** Archive audit events older than retention window to cold storage. */
export async function GET(request: Request) {
  if (!authorizeCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const asOf = new Date().toISOString().slice(0, 10);
  const result = await runAuditArchiveJob(asOf);

  return NextResponse.json({ ok: true, asOf, ...result });
}
