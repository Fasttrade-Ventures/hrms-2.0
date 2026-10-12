import { ApplyBehalfForm } from "@/components/hr/apply-behalf/apply-behalf-ui";
import { requireRole } from "@/lib/auth/session";
import {
  listActiveEmployeesForBehalf,
  listClaimTypesForBehalf,
  listLeaveTypesForBehalf,
} from "@/lib/hr/apply-behalf";

export default async function NewApplyBehalfPage() {
  await requireRole("hr_administrator");

  const [employees, leaveTypes, claimTypes] = await Promise.all([
    listActiveEmployeesForBehalf(),
    listLeaveTypesForBehalf(),
    listClaimTypesForBehalf(),
  ]);

  return (
    <ApplyBehalfForm
      claimTypes={claimTypes}
      employees={employees}
      leaveTypes={leaveTypes}
    />
  );
}
