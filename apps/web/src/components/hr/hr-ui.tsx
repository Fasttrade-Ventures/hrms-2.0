import type { ReactNode } from "react";

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
        "grid gap-3",
        columns === 5 ? "sm:grid-cols-2 lg:grid-cols-5" : "sm:grid-cols-2 lg:grid-cols-3",
      )}
    >
      {items.map((item) => (
        <Card className="py-0" key={item.label} size="sm">
          <CardContent
            className={cn(
              "flex flex-col gap-0.5",
              compact ? "px-4 py-3" : "px-4 py-4",
            )}
          >
            <p className="text-xs font-medium text-muted-foreground">{item.label}</p>
            <p
              className={cn(
                "font-semibold tabular-nums tracking-tight",
                compact ? "text-lg" : "text-2xl",
              )}
            >
              {item.value}
            </p>
            {item.hint ? <p className="text-[11px] text-muted-foreground">{item.hint}</p> : null}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function HrTableCard({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <Card className={cn("overflow-hidden py-0", className)}>
      <CardContent className="p-0">{children}</CardContent>
    </Card>
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
