import { ApplyBehalfForm } from "@/components/hr/apply-behalf/apply-behalf-ui";
import {
  submitBranchBehalfClaim,
  submitBranchBehalfLate,
  submitBranchBehalfLeave,
  submitBranchBehalfOvertime,
  submitBranchBehalfReplacementCredit,
} from "@/app/(branch-admin)/branch-admin/apply-behalf/actions";
import { requireBranchAdminContext } from "@/lib/branch-admin/context";
import {
  listActiveEmployeesForBehalf,
  listClaimTypesForBehalf,
  listLeaveTypesForBehalf,
} from "@/lib/hr/apply-behalf";

export default async function BranchNewApplyBehalfPage() {
  const context = await requireBranchAdminContext();

  const [employees, leaveTypes, claimTypes] = await Promise.all([
    listActiveEmployeesForBehalf({ branchIds: context.branchIds }),
    listLeaveTypesForBehalf(),
    listClaimTypesForBehalf(),
  ]);

  return (
    <ApplyBehalfForm
      claimAction={submitBranchBehalfClaim}
      claimTypes={claimTypes}
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
