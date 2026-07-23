import { notFound } from "next/navigation";

import { requireRole } from "@/lib/auth/session";
import { buildEmployeeDossierPdf, dossierFilename, getEmployeeDossier } from "@/lib/employees/dossier";

export async function GET(
  _request: Request,
  context: { params: Promise<{ employeeId: string }> },
) {
  await requireRole("hr_administrator");

  const { employeeId } = await context.params;
  const employee = await getEmployeeDossier(employeeId);

  if (!employee) {
    notFound();
  }

  const pdf = buildEmployeeDossierPdf(employee);
  const filename = dossierFilename(employee);
  const url = new URL(_request.url);
  const download = url.searchParams.get("download") === "1";

  return new Response(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
