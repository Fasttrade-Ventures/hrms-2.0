import type { ReactNode } from "react";

import { PortalLayout } from "@/components/portal-layout";

export default function EmployeeLayout({ children }: { children: ReactNode }) {
  return <PortalLayout portal="Employee">{children}</PortalLayout>;
}
