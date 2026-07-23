import { EmptyState } from "@hrms/ui";

import { PortalPageHeader } from "@/components/portal/portal-primitives";

export default function Page() {
  return (
    <div className="space-y-6">
      <PortalPageHeader description="In-app and email notifications." title="Notifications" />
      <EmptyState
        description="Notification delivery will connect in Phase 6 shared services."
        title="No notifications"
      />
    </div>
  );
}
