import { authorizeBearerSecret } from "@/lib/cron/authorize";
import { NextResponse } from "next/server";

import { runHealthChecks } from "@hrms/platform";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!authorizeBearerSecret(request, process.env.CRON_SECRET)) {
    return NextResponse.json({ ok: true, timestamp: new Date().toISOString() });
  }

  const report = await runHealthChecks();
  return NextResponse.json(report, { status: report.ok ? 200 : 503 });
}
