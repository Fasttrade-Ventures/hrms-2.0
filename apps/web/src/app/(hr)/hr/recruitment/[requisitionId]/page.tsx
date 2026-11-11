import Link from "next/link";
import { notFound } from "next/navigation";

import { RequisitionDesk } from "@/components/hr/recruitment/requisition-desk";
import { requireRoleOrPermission } from "@/lib/auth/session";
import { requireModule } from "@/lib/entitlements";
import { listBranches, listDepartments } from "@/lib/hr/organization";
import { getRequisitionPipeline } from "@/lib/recruitment/applications";
import { getRequisition } from "@/lib/recruitment/requisitions";

export default async function Page({ params }: { params: Promise<{ requisitionId: string }> }) {
  await requireModule("recruitment");
  await requireRoleOrPermission(["hr_administrator", "organization_owner"], ["recruiter"]);
  const { requisitionId } = await params;

  const [detail, pipeline, branches, departments] = await Promise.all([
    getRequisition(requisitionId),
    getRequisitionPipeline(requisitionId),
    listBranches().catch(() => []),
    listDepartments().catch(() => []),
  ]);
  if (!detail || !pipeline) notFound();

  const branchOptions = branches.map((branch) => ({ id: branch.id, name: branch.name }));
  const departmentOptions = departments.map((department) => ({
    id: department.id,
    name: department.name,
  }));

  return (
    <div className="space-y-4">
      <Link className="inline-block text-sm font-medium text-primary" href="/hr/recruitment">
        ← Back to recruitment
      </Link>

      <RequisitionDesk
        applications={pipeline.applications}
        branches={branchOptions}
        departments={departmentOptions}
        detail={detail}
        requisitionId={requisitionId}
      />
    </div>
  );
}
