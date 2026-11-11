import type { ReactNode } from "react";

import { StatCard } from "@hrms/ui";

import { PortalCard } from "@/components/portal/portal-card";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function HrStatCards({
  items,
  columns = 3,
  compact = false,
}: {
  items: Array<{ label: string; value: string | number; hint?: string }>;
  columns?: 3 | 5;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "grid",
        compact ? "gap-2" : "gap-3",
        columns === 5 ? "sm:grid-cols-2 lg:grid-cols-5" : "sm:grid-cols-2 lg:grid-cols-3",
      )}
    >
      {items.map((item) => (
        <StatCard hint={item.hint} key={item.label} label={item.label} value={item.value} />
      ))}
    </div>
  );
}

export function HrTableCard({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <PortalCard className={cn("overflow-hidden", className)} padding="none">
      {children}
    </PortalCard>
  );
}

export function HrBanner({ children }: { children: ReactNode }) {
  return (
    <Card className="border-primary/30 bg-accent py-3">
      <CardContent className="py-0 text-sm text-foreground">{children}</CardContent>
    </Card>
  );
}

export type HrPaginationLink = {
  page: number;
  href: string;
};
