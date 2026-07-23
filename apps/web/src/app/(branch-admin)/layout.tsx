import type { ReactNode } from "react";

import { PortalLayout } from "@/components/portal-layout";

export default function BranchAdminLayout({ children }: { children: ReactNode }) {
  return <PortalLayout portal="Branch Admin">{children}</PortalLayout>;
}
