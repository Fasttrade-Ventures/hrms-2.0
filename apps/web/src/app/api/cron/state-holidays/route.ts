import { authorizeCron } from "@/lib/cron/authorize";
import { NextResponse } from "next/server";

import { syncBranchesWithState } from "@/lib/hr/sync-state-holidays";

export async function GET(request: Request) {
  if (!authorizeCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const yearParam = new URL(request.url).searchParams.get("year");
  const year = yearParam ? Number(yearParam) : new Date().getUTCFullYear();
  const result = await syncBranchesWithState(year);
  return NextResponse.json({ ok: true, year, ...result });
}
