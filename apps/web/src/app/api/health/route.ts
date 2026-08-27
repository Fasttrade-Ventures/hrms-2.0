import { NextResponse } from "next/server";

import { runHealthChecks } from "@hrms/platform";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function authorizeDeepHealth(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = request.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!authorizeDeepHealth(request)) {
    return NextResponse.json({ ok: true, timestamp: new Date().toISOString() });
  }

  const report = await runHealthChecks();
  return NextResponse.json(report, { status: report.ok ? 200 : 503 });
}
