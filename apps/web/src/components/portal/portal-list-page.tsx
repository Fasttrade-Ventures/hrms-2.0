import type { ReactNode } from "react";

import { PortalPageHeader } from "@/components/portal/portal-primitives";

export function PortalListPage({
  title,
  description,
  actions,
  stats,
  filters,
  children,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  stats?: ReactNode;
  filters?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="space-y-6">
      <PortalPageHeader actions={actions} description={description} title={title} />
      {stats ? <div>{stats}</div> : null}
      {filters ? <div>{filters}</div> : null}
      {children}
    </div>
  );
}
