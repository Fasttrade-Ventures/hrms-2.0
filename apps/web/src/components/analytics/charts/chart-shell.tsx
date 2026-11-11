"use client";

import { PortalSectionCard } from "@/components/portal/portal-section";

export function ChartShell({
  title,
  empty,
  children,
}: {
  title: string;
  empty?: boolean;
  children: React.ReactNode;
}) {
  return (
    <PortalSectionCard title={title}>
      {empty ? (
        <p className="py-10 text-center text-sm text-muted-foreground">Not enough data in this period.</p>
      ) : (
        <div className="h-64 w-full">{children}</div>
      )}
    </PortalSectionCard>
  );
}
