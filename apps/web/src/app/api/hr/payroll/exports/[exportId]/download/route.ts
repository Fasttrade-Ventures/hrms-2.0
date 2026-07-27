import { redirect } from "next/navigation";

import { requireRole } from "@/lib/auth/session";
import { getPayrollExportDownloadUrl } from "@/lib/payroll/exports/store";

export async function GET(
  _request: Request,
  context: { params: Promise<{ exportId: string }> },
) {
  await requireRole("hr_administrator");
  const { exportId } = await context.params;
  const url = await getPayrollExportDownloadUrl(exportId);
  if (!url) {
    return new Response("Export not found", { status: 404 });
  }
  redirect(url);
}
