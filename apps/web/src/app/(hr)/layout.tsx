import type { ReactNode } from "react";

import { PortalLayout } from "@/components/portal-layout";

export default function HrLayout({ children }: { children: ReactNode }) {
  // Mirrors canAccessPath for /hr: HR, Owner, and (limited) Branch Admin.
  return (
    <PortalLayout
      portal="HR Administrator"
      requiredRoles={["hr_administrator", "organization_owner", "branch_admin"]}
    >
      {children}
    </PortalLayout>
  );
}
