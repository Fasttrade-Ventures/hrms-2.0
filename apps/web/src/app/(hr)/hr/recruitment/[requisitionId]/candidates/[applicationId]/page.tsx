import Link from "next/link";
import { notFound } from "next/navigation";

import { CandidateDetail } from "@/components/hr/recruitment/candidate-detail";
import { PortalPageHeader } from "@/components/portal/portal-primitives";
import { requireRoleOrPermission } from "@/lib/auth/session";
import { requireModule } from "@/lib/entitlements";
import { listActiveTemplatesByType } from "@/lib/letters/templates";
import { getApplicationDetail } from "@/lib/recruitment/applications";

export default async function Page({
  params,
}: {
  params: Promise<{ requisitionId: string; applicationId: string }>;
}) {
  await requireModule("recruitment");
  const session = await requireRoleOrPermission(["hr_administrator", "organization_owner"], ["recruiter"]);
  const { requisitionId, applicationId } = await params;

  const [detail, offerTemplates, agreementTemplates] = await Promise.all([
    getApplicationDetail(requisitionId, applicationId),
    listActiveTemplatesByType("offer"),
    listActiveTemplatesByType("employment_agreement"),
  ]);
  if (!detail) notFound();

  const readOnly = detail.requisition.status === "on_hold" || detail.requisition.status === "closed";
  const roles = session.membership.roles;
  const canManageLetters = roles.includes("hr_administrator") || roles.includes("organization_owner");

  return (
    <div className="space-y-8">
      <PortalPageHeader
        actions={
          <Link className="text-sm font-medium text-primary" href={`/hr/recruitment/${requisitionId}`}>
            Back to pipeline
          </Link>
        }
        description={`Candidate for ${detail.requisition.title}`}
        title={detail.candidate.full_name}
      />
      <CandidateDetail
        canManageLetters={canManageLetters}
        detail={detail}
        hasAgreementTemplate={agreementTemplates.length > 0}
        offerTemplates={offerTemplates.map((template) => ({
          id: template.id,
          name: template.name,
          body: template.body,
        }))}
        readOnly={readOnly}
        requisitionId={requisitionId}
      />
    </div>
  );
}
