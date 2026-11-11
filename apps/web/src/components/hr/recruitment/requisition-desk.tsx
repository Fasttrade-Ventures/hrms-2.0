"use client";

import { useState, type ComponentProps } from "react";

import { AddCandidatePanel } from "@/components/hr/recruitment/add-candidate-panel";
import { HrBanner } from "@/components/hr/hr-ui";
import { RecruitmentPipeline } from "@/components/hr/recruitment/recruitment-pipeline";
import { RequisitionCommandStrip } from "@/components/hr/recruitment/requisition-command-strip";
import type { OrgSelectOption } from "@/components/hr/recruitment/requisition-form-fields";
import type { RequisitionDetail } from "@/lib/recruitment/requisitions";

type PipelineApplications = ComponentProps<typeof RecruitmentPipeline>["applications"];

export function RequisitionDesk({
  requisitionId,
  detail,
  applications,
  branches,
  departments,
}: {
  requisitionId: string;
  detail: RequisitionDetail;
  applications: PipelineApplications;
  branches: OrgSelectOption[];
  departments: OrgSelectOption[];
}) {
  const readOnly = detail.status === "on_hold" || detail.status === "closed";
  const [addOpen, setAddOpen] = useState(detail.status === "open" && applications.length === 0);

  return (
    <>
      <RequisitionCommandStrip
        addDisabled={readOnly}
        branches={branches}
        departments={departments}
        detail={detail}
        onAddCandidate={() => setAddOpen(true)}
      />

      {readOnly ? (
        <HrBanner>
          {detail.status === "on_hold"
            ? "This requisition is on hold. The pipeline is read-only and new candidates cannot be added."
            : "This requisition is closed. The pipeline is read-only and new candidates cannot be added."}
        </HrBanner>
      ) : (
        <AddCandidatePanel
          onOpenChange={setAddOpen}
          open={addOpen}
          requisitionId={requisitionId}
        />
      )}

      <RecruitmentPipeline
        applications={applications}
        onRequestAdd={readOnly ? undefined : () => setAddOpen(true)}
        requisitionId={requisitionId}
        requisitionStatus={detail.status}
      />
    </>
  );
}
