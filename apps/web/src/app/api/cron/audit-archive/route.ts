import { NextResponse } from "next/server";

import { runAuditArchiveJob } from "@/lib/audit/jobs/archive";

function authorizeCron(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

/** Archive audit events older than retention window to cold storage. */
export async function GET(request: Request) {
  if (!authorizeCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const asOf = new Date().toISOString().slice(0, 10);
  const result = await runAuditArchiveJob(asOf);

  return NextResponse.json({ ok: true, asOf, ...result });
}
