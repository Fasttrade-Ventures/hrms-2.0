import Link from "next/link";
import { notFound } from "next/navigation";

import { AddCandidateForm } from "@/components/hr/recruitment/create-requisition-form";
import { RecruitmentPipeline } from "@/components/hr/recruitment/recruitment-pipeline";
import { HrBanner } from "@/components/hr/hr-ui";
import { PortalPageHeader } from "@/components/portal/portal-primitives";
import { requireRoleOrPermission } from "@/lib/auth/session";
import { requireModule } from "@/lib/entitlements";
import { getRequisitionPipeline } from "@/lib/recruitment/applications";
import type { RequisitionStatus } from "@/lib/recruitment/requisition-status";

export default async function Page({ params }: { params: Promise<{ requisitionId: string }> }) {
  await requireModule("recruitment");
  await requireRoleOrPermission(["hr_administrator", "organization_owner"], ["recruiter"]);
  const { requisitionId } = await params;

  const pipeline = await getRequisitionPipeline(requisitionId);
  if (!pipeline) notFound();

  const status = pipeline.requisition.status as RequisitionStatus;
  const readOnlyBoard = status === "on_hold" || status === "closed";

  return (
    <div className="space-y-8">
      <PortalPageHeader
        actions={
          <Link className="text-sm font-medium text-primary" href="/hr/recruitment">
            Back to recruitment
          </Link>
        }
        description={pipeline.requisition.description ?? undefined}
        title={pipeline.requisition.title}
      />

      {readOnlyBoard ? (
        <HrBanner>
          {status === "on_hold"
            ? "This requisition is on hold. The pipeline is read-only and new candidates cannot be added."
            : "This requisition is closed. The pipeline is read-only and new candidates cannot be added."}
        </HrBanner>
      ) : null}

      {status === "open" ? <AddCandidateForm requisitionId={requisitionId} /> : null}
      <RecruitmentPipeline
        applications={pipeline.applications}
        requisitionId={requisitionId}
        requisitionStatus={status}
      />
    </div>
  );
}
