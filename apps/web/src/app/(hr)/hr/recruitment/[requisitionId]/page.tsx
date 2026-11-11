import Link from "next/link";
import { notFound } from "next/navigation";

import { AddCandidatePanel } from "@/components/hr/recruitment/add-candidate-panel";
import { RecruitmentPipeline } from "@/components/hr/recruitment/recruitment-pipeline";
import { HrBanner } from "@/components/hr/hr-ui";
import { Badge } from "@/components/ui/badge";
import { PortalPageHeader } from "@/components/portal/portal-primitives";
import { requireRoleOrPermission } from "@/lib/auth/session";
import { requireModule } from "@/lib/entitlements";
import { getRequisitionPipeline } from "@/lib/recruitment/applications";
import type { RequisitionStatus } from "@/lib/recruitment/requisition-status";

function statusBadge(status: RequisitionStatus) {
  if (status === "open") return <Badge variant="success">Open</Badge>;
  if (status === "on_hold") return <Badge variant="warning">On hold</Badge>;
  return <Badge variant="outline">Closed</Badge>;
}

export default async function Page({ params }: { params: Promise<{ requisitionId: string }> }) {
  await requireModule("recruitment");
  await requireRoleOrPermission(["hr_administrator", "organization_owner"], ["recruiter"]);
  const { requisitionId } = await params;

  const pipeline = await getRequisitionPipeline(requisitionId);
  if (!pipeline) notFound();

  const status = pipeline.requisition.status as RequisitionStatus;
  const readOnlyBoard = status === "on_hold" || status === "closed";
  const applicationCount = pipeline.applications.length;

  return (
    <div className="space-y-6">
      <PortalPageHeader
        actions={
          <Link className="text-sm font-medium text-primary" href="/hr/recruitment">
            Back to recruitment
          </Link>
        }
        description={pipeline.requisition.description ?? undefined}
        title={pipeline.requisition.title}
      />

      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        {statusBadge(status)}
        <span>
          {applicationCount} candidate{applicationCount === 1 ? "" : "s"} on board
        </span>
      </div>

      {readOnlyBoard ? (
        <HrBanner>
          {status === "on_hold"
            ? "This requisition is on hold. The pipeline is read-only and new candidates cannot be added."
            : "This requisition is closed. The pipeline is read-only and new candidates cannot be added."}
        </HrBanner>
      ) : null}

      {status === "open" ? (
        <AddCandidatePanel defaultOpen={applicationCount === 0} requisitionId={requisitionId} />
      ) : null}

      <RecruitmentPipeline
        applications={pipeline.applications}
        requisitionId={requisitionId}
        requisitionStatus={status}
      />
    </div>
  );
}
