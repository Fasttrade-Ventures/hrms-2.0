import { notFound } from "next/navigation";

import { EmployeeProfileView } from "@/components/hr/employees/employee-profile-view";
import { HrLinkButton } from "@/components/hr/hr-ui.client";
import { PortalPageHeader } from "@/components/portal/portal-primitives";
import { Button } from "@/components/ui/button";
import { requireRole } from "@/lib/auth/session";
import { getEmployeeDossier } from "@/lib/employees/dossier";

export default async function EmployeeDossierPage({
  params,
}: {
  params: Promise<{ employeeId: string }>;
}) {
  await requireRole("hr_administrator");

  const { employeeId } = await params;
  const employee = await getEmployeeDossier(employeeId);

  if (!employee) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <PortalPageHeader
        actions={
          <div className="flex flex-wrap items-center justify-end gap-2">
            <HrLinkButton href={`/hr/employees/${employee.id}`} size="sm" variant="outline">
              View profile
            </HrLinkButton>
            <HrLinkButton href={`/hr/employees/${employee.id}/edit`} size="sm" variant="outline">
              Edit employee
            </HrLinkButton>
            <Button
              render={
                <a
                  href={`/hr/employees/${employee.id}/dossier/pdf`}
                  rel="noreferrer"
                  target="_blank"
                />
              }
              size="sm"
              variant="outline"
            >
              Open PDF
            </Button>
            <Button
              render={
                <a
                  download
                  href={`/hr/employees/${employee.id}/dossier/pdf?download=1`}
                />
              }
              size="sm"
            >
              Download PDF
            </Button>
          </div>
        }
        description={`${employee.employeeNumber} · ${employee.email}`}
        title="Employee dossier"
      />

      <EmployeeProfileView employee={employee} />
    </div>
  );
}
