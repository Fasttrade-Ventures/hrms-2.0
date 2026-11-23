"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ReportFilters } from "@/lib/reports/types";

/** Date-range + employee search for manager Team Attendance (no org-wide branch/dept). */
export function TeamAttendanceFilterBar({
  filters,
}: {
  filters: Pick<ReportFilters, "preset" | "from" | "to" | "employeeQuery">;
}) {
  const pathname = usePathname();

  return (
    <Card className="py-0">
      <CardContent className="flex flex-col gap-3 py-3">
        <form action={pathname} className="grid gap-3 md:grid-cols-2 xl:grid-cols-4" method="get">
          <div className="space-y-1">
            <Label htmlFor="preset">Date preset</Label>
            <select
              className="flex h-10 w-full rounded-lg border border-input bg-[var(--surface-card)] px-3.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              defaultValue={filters.preset}
              id="preset"
              name="preset"
            >
              <option value="this_month">This month</option>
              <option value="last_month">Last month</option>
              <option value="this_quarter">This quarter</option>
              <option value="ytd">Year to date</option>
              <option value="custom">Custom range</option>
            </select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="from">From</Label>
            <Input defaultValue={filters.from} id="from" name="from" type="date" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="to">To</Label>
            <Input defaultValue={filters.to} id="to" name="to" type="date" />
          </div>

          <div className="space-y-1">
            <Label htmlFor="q">Employee search</Label>
            <Input
              defaultValue={filters.employeeQuery ?? ""}
              id="q"
              name="q"
              placeholder="Name or employee number"
              type="search"
            />
          </div>

          <div className="flex items-end gap-2 md:col-span-2 xl:col-span-4">
            <Button size="sm" type="submit">
              Apply filters
            </Button>
            <Button render={<Link href={pathname} />} size="sm" variant="outline">
              Reset
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
