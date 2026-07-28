import Link from "next/link";
import { notFound } from "next/navigation";

import { AddCandidateForm } from "@/components/hr/recruitment/create-requisition-form";
import { RecruitmentPipeline } from "@/components/hr/recruitment/recruitment-pipeline";
import { PortalPageHeader } from "@/components/portal/portal-primitives";
import { requireRole } from "@/lib/auth/session";
import { requireModule } from "@/lib/entitlements";
import { getRequisitionPipeline } from "@/lib/recruitment/applications";

export default async function Page({ params }: { params: Promise<{ requisitionId: string }> }) {
  await requireModule("recruitment");
  await requireRole("hr_administrator");
  const { requisitionId } = await params;

  const pipeline = await getRequisitionPipeline(requisitionId);
  if (!pipeline) notFound();

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

      <AddCandidateForm requisitionId={requisitionId} />
      <RecruitmentPipeline applications={pipeline.applications} requisitionId={requisitionId} />
    </div>
  );
}
