import { ApplyBehalfForm } from "@/components/hr/apply-behalf/apply-behalf-ui";
import { requireRole } from "@/lib/auth/session";
import { getOrganizationDisplay } from "@/lib/organization-display";
import {
  listActiveEmployeesForBehalf,
  listClaimTypesForBehalf,
  listLeaveTypesForBehalf,
} from "@/lib/hr/apply-behalf";

export default async function NewApplyBehalfPage() {
  await requireRole("hr_administrator");

  const [employees, leaveTypes, claimTypes, { currency }] = await Promise.all([
    listActiveEmployeesForBehalf(),
    listLeaveTypesForBehalf(),
    listClaimTypesForBehalf(),
    getOrganizationDisplay(),
  ]);

  return (
    <ApplyBehalfForm
      claimTypes={claimTypes}
      currency={currency}
      employees={employees}
      leaveTypes={leaveTypes}
    />
  );
}
