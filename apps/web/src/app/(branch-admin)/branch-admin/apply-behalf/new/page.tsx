import { ApplyBehalfForm } from "@/components/hr/apply-behalf/apply-behalf-ui";
import {
  submitBranchBehalfLate,
  submitBranchBehalfLeave,
} from "@/app/(branch-admin)/branch-admin/apply-behalf/actions";
import { requireBranchAdminContext } from "@/lib/branch-admin/context";
import { listActiveEmployeesForBehalf, listLeaveTypesForBehalf } from "@/lib/hr/apply-behalf";

export default async function BranchNewApplyBehalfPage() {
  const context = await requireBranchAdminContext();

  const [employees, leaveTypes] = await Promise.all([
    listActiveEmployeesForBehalf({ branchIds: context.branchIds }),
    listLeaveTypesForBehalf(),
  ]);

  return (
    <ApplyBehalfForm
      employees={employees}
      lateAction={submitBranchBehalfLate}
      leaveAction={submitBranchBehalfLeave}
      leaveTypes={leaveTypes}
      listHref="/branch-admin/apply-behalf"
    />
  );
}
