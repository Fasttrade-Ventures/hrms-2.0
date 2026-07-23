import { NextResponse } from "next/server";

import { runHealthChecks } from "@hrms/platform";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const report = await runHealthChecks();
  return NextResponse.json(report, { status: report.ok ? 200 : 503 });
}
