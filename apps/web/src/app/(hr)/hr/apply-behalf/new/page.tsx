import { ApplyBehalfForm } from "@/components/hr/apply-behalf/apply-behalf-ui";
import { requireRole } from "@/lib/auth/session";
import { listActiveEmployeesForBehalf, listLeaveTypesForBehalf } from "@/lib/hr/apply-behalf";

export default async function NewApplyBehalfPage() {
  await requireRole("hr_administrator");

  const [employees, leaveTypes] = await Promise.all([
    listActiveEmployeesForBehalf(),
    listLeaveTypesForBehalf(),
  ]);

  return <ApplyBehalfForm employees={employees} leaveTypes={leaveTypes} />;
}
