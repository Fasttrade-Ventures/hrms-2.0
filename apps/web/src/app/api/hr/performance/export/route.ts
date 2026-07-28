import { NextResponse } from "next/server";

import { logAuditEvent } from "@/lib/audit/log-event";
import { requireModule } from "@/lib/entitlements";
import { cycleAppraisalsToCsv, listCycleAppraisalsForExport } from "@/lib/hr/performance";
import { requireRole } from "@/lib/auth/session";

export async function GET(request: Request) {
  const session = await requireRole("hr_administrator");
  await requireModule("performance");

  const cycleId = new URL(request.url).searchParams.get("cycleId");
  if (!cycleId) {
    return NextResponse.json({ error: "cycleId is required." }, { status: 400 });
  }

  const rows = await listCycleAppraisalsForExport(cycleId);
  const csv = cycleAppraisalsToCsv(rows);
  const filename = `performance-export-${cycleId.slice(0, 8)}.csv`;

  await logAuditEvent({
    actorUserId: session.user.id,
    action: "performance.exported",
    resourceType: "review_cycle",
    resourceId: cycleId,
    metadata: { rowCount: rows.length },
  });

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
