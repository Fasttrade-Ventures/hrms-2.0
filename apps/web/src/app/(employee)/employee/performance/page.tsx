import { EmptyState } from "@hrms/ui";

import { PortalPageHeader } from "@/components/portal/portal-primitives";

export default function Page() {
  return (
    <div className="space-y-6">
      <PortalPageHeader description="Performance reviews and goals." title="Performance" />
      <EmptyState
        description="Appraisal cycles will appear here when HR publishes a review period."
        title="No performance reviews"
      />
    </div>
  );
}
