import { ApplyBehalfForm } from "@/components/hr/apply-behalf/apply-behalf-ui";
import {
  submitBranchBehalfClaim,
  submitBranchBehalfLate,
  submitBranchBehalfLeave,
  submitBranchBehalfOvertime,
  submitBranchBehalfReplacementCredit,
} from "@/app/(branch-admin)/branch-admin/apply-behalf/actions";
import { requireBranchAdminContext } from "@/lib/branch-admin/context";
import { getOrganizationDisplay } from "@/lib/organization-display";
import {
  listActiveEmployeesForBehalf,
  listClaimTypesForBehalf,
  listLeaveTypesForBehalf,
} from "@/lib/hr/apply-behalf";

export default async function BranchNewApplyBehalfPage() {
  const context = await requireBranchAdminContext();

  const [employees, leaveTypes, claimTypes, { currency }] = await Promise.all([
    listActiveEmployeesForBehalf({ branchIds: context.branchIds }),
    listLeaveTypesForBehalf(),
    listClaimTypesForBehalf(),
    getOrganizationDisplay(),
  ]);

  return (
    <ApplyBehalfForm
      claimAction={submitBranchBehalfClaim}
      claimTypes={claimTypes}
      currency={currency}
      employees={employees}
      lateAction={submitBranchBehalfLate}
      leaveAction={submitBranchBehalfLeave}
      leaveTypes={leaveTypes}
      listHref="/branch-admin/apply-behalf"
      overtimeAction={submitBranchBehalfOvertime}
      replacementAction={submitBranchBehalfReplacementCredit}
    />
  );
}
