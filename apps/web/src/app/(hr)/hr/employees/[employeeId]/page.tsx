import { notFound } from "next/navigation";

import { EmployeeDetailView, isEmployeeTab } from "@/components/hr/employees/employee-detail";
import { requireRole } from "@/lib/auth/session";
import { getEmployeeDetail, getEmployeeOptions } from "@/lib/employees/queries";

export default async function EmployeeDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ employeeId: string }>;
  searchParams: Promise<{ tab?: string; created?: string; emailWarning?: string }>;
}) {
  await requireRole("hr_administrator");

  const { employeeId } = await params;
  const query = await searchParams;
  const activeTab = isEmployeeTab(query.tab) ? query.tab : "personal";

  const [employee, options] = await Promise.all([
    getEmployeeDetail(employeeId),
    getEmployeeOptions(),
  ]);

  if (!employee) {
    notFound();
  }

  let banner: string | undefined;

  if (query.created === "1") {
    banner = query.emailWarning === "1"
      ? "Employee created. Activation email could not be sent — check Resend configuration and resend from the Security tab."
      : "Employee created successfully.";
  }

  return (
    <EmployeeDetailView
      activeTab={activeTab}
      banner={banner}
      branches={options.branches}
      departments={options.departments}
      employee={employee}
      managers={options.managers}
    />
  );
}
