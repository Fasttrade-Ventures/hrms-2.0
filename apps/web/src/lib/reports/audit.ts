import { logAuditEvent } from "@/lib/audit/log-event";
import { requireAuth } from "@/lib/auth/session";

import type { ReportFilters, ReportSlug } from "./types";

export async function logReportExport(input: {
  slug: ReportSlug;
  format: "csv" | "print";
  filters: ReportFilters;
}): Promise<void> {
  const session = await requireAuth();
  await logAuditEvent({
    organizationId: session.membership.organizationId,
    actorUserId: session.user.id,
    action: "report.exported",
    resourceType: "report",
    resourceId: input.slug,
    metadata: { format: input.format, filters: input.filters },
  });
}
