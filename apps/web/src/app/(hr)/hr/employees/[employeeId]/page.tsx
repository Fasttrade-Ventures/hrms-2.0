import { notFound } from "next/navigation";

import { EmployeeDocumentsSection } from "@/components/hr/documents/employee-documents-section";
import { DeleteEmployeeButton } from "@/components/hr/employees/delete-employee-button";
import { EmployeeProfileView } from "@/components/hr/employees/employee-profile-view";
import { HrLinkButton } from "@/components/hr/hr-ui.client";
import { PortalPageHeader } from "@/components/portal/portal-primitives";
import { requireRole } from "@/lib/auth/session";
import { getEmployeeDetail, listActiveEmployeesForSelect } from "@/lib/employees/queries";
import { listDocumentFolders } from "@/lib/hr/document-folders";
import { listEmployeeDocumentsForProfile, listRequiredDocuments } from "@/lib/hr/documents";

export default async function ViewEmployeePage({
  params,
}: {
  params: Promise<{ employeeId: string }>;
}) {
  await requireRole("hr_administrator");

  const { employeeId } = await params;
  const [employee, documents, employees, requiredTypes, folders] = await Promise.all([
    getEmployeeDetail(employeeId),
    listEmployeeDocumentsForProfile(employeeId).catch(() => []),
    listActiveEmployeesForSelect().catch(() => []),
    listRequiredDocuments(true).catch(() => []),
    listDocumentFolders().catch(() => []),
  ]);

  if (!employee) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <PortalPageHeader
        actions={
          <div className="flex flex-wrap gap-2">
            <HrLinkButton href="/hr/employees" variant="outline">
              Back to list
            </HrLinkButton>
            <HrLinkButton href={`/hr/employees/${employee.id}/dossier`} variant="outline">
              View dossier
            </HrLinkButton>
            <DeleteEmployeeButton employeeId={employee.id} employeeName={employee.fullName} />
            <HrLinkButton href={`/hr/employees/${employee.id}/edit`}>Edit employee</HrLinkButton>
          </div>
        }
        description={`${employee.employeeNumber} · ${employee.email}`}
        title={employee.fullName}
      />

      <EmployeeProfileView employee={employee} />

      <EmployeeDocumentsSection
        documents={documents}
        employeeId={employee.id}
        employeeName={employee.fullName}
        employees={employees}
        folders={folders}
        requiredTypes={requiredTypes}
      />
    </div>
  );
}
