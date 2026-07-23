import type { ReactNode } from "react";

import { PortalLayout } from "@/components/portal-layout";

export default function HrLayout({ children }: { children: ReactNode }) {
  return <PortalLayout portal="HR Administrator">{children}</PortalLayout>;
}
