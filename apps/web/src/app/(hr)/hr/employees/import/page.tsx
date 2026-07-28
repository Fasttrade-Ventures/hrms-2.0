import { EmployeeImportForm } from "@/components/hr/employees/employee-import-form";
import { requireModule } from "@/lib/entitlements";
import { requireRole } from "@/lib/auth/session";

export default async function EmployeeImportPage() {
  await requireRole("hr_administrator");
  await requireModule("import");

  return <EmployeeImportForm />;
}
