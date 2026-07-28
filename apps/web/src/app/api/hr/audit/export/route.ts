import { NextResponse } from "next/server";

import { requireAuditAccess } from "@/lib/audit/access";
import { auditEventsToCsv, listAuditEvents } from "@/lib/audit/queries";

export async function GET(request: Request) {
  await requireAuditAccess();

  const url = new URL(request.url);
  const { events } = await listAuditEvents({
    action: url.searchParams.get("action") ?? undefined,
    resourceType: url.searchParams.get("resourceType") ?? undefined,
    from: url.searchParams.get("from") ?? undefined,
    to: url.searchParams.get("to") ?? undefined,
    limit: 1000,
  });

  const csv = auditEventsToCsv(events);
  const filename = `audit-export-${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
