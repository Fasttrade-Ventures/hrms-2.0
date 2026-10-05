import { NextResponse } from "next/server";

import { performRecordRetention } from "@/lib/audit/jobs/record-retention";

function authorizeCron(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!authorizeCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const result = await performRecordRetention({
    asOf: searchParams.get("asOf") || undefined,
    organizationId: searchParams.get("orgId") || undefined,
    dryRun: searchParams.get("dryRun") === "true",
  });

  return NextResponse.json({ ok: true, ...result });
}

export const POST = GET;
