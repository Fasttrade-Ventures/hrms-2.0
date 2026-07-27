"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ReportDefinition } from "@/lib/reports/catalog";
import type { ReportFilters } from "@/lib/reports/types";

type Option = { id: string; name: string };

export function ReportFilterBar({
  filters,
  definition,
  branches,
  departments,
}: {
  filters: ReportFilters;
  definition: ReportDefinition;
  branches: Option[];
  departments: Option[];
}) {
  const pathname = usePathname();

  return (
    <Card className="py-0">
      <CardContent className="flex flex-col gap-3 py-3">
        <form action={pathname} className="grid gap-3 md:grid-cols-2 xl:grid-cols-4" method="get">
          <div className="space-y-1">
            <Label htmlFor="preset">Date preset</Label>
            <select
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
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

          {definition.usesDateRange || filters.preset === "custom" ? (
            <>
              <div className="space-y-1">
                <Label htmlFor="from">From</Label>
                <Input defaultValue={filters.from} id="from" name="from" type="date" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="to">To</Label>
                <Input defaultValue={filters.to} id="to" name="to" type="date" />
              </div>
            </>
          ) : null}

          {definition.usesAsOf ? (
            <div className="space-y-1">
              <Label htmlFor="asOf">As of</Label>
              <Input defaultValue={filters.asOf} id="asOf" name="asOf" type="date" />
            </div>
          ) : null}

          <div className="space-y-1">
            <Label htmlFor="branch">Branch</Label>
            <select
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              defaultValue={filters.branchId ?? ""}
              id="branch"
              name="branch"
            >
              <option value="">All branches</option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="department">Department</Label>
            <select
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              defaultValue={filters.departmentId ?? ""}
              id="department"
              name="department"
            >
              <option value="">All departments</option>
              {departments.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="status">Employment status</Label>
            <select
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              defaultValue={filters.employmentStatus}
              id="status"
              name="status"
            >
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="on_leave">On leave</option>
            </select>
          </div>

          <div className="space-y-1 md:col-span-2">
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
