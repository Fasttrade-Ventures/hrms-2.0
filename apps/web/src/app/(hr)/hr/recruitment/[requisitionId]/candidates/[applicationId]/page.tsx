import Link from "next/link";
import { notFound } from "next/navigation";

import { CandidateDetail } from "@/components/hr/recruitment/candidate-detail";
import { PortalPageHeader } from "@/components/portal/portal-primitives";
import { requireRoleOrPermission } from "@/lib/auth/session";
import { requireModule } from "@/lib/entitlements";
import { getApplicationDetail } from "@/lib/recruitment/applications";

export default async function Page({
  params,
}: {
  params: Promise<{ requisitionId: string; applicationId: string }>;
}) {
  await requireModule("recruitment");
  await requireRoleOrPermission(["hr_administrator", "organization_owner"], ["recruiter"]);
  const { requisitionId, applicationId } = await params;

  const detail = await getApplicationDetail(requisitionId, applicationId);
  if (!detail) notFound();

  const readOnly = detail.requisition.status === "on_hold" || detail.requisition.status === "closed";

  return (
    <div className="space-y-8">
      <PortalPageHeader
        actions={
          <Link className="text-sm font-medium text-primary" href={`/hr/recruitment/${requisitionId}`}>
            Back to pipeline
          </Link>
        }
        description={detail.requisition.title}
        title={detail.candidate.full_name}
      />
      <CandidateDetail detail={detail} readOnly={readOnly} requisitionId={requisitionId} />
    </div>
  );
}
