import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { HrCalendarFilters } from "@/lib/calendar/types";
import { cn } from "@/lib/utils";

type Option = { id: string; name: string };

export function CalendarFilters({
  basePath,
  year,
  month,
  branches,
  departments,
  leaveTypes,
  filters,
}: {
  basePath: string;
  year: number;
  month: number;
  branches: Option[];
  departments: Option[];
  leaveTypes: Option[];
  filters: HrCalendarFilters;
}) {
  const action = `${basePath}?year=${year}&month=${month}`;

  return (
    <form action={action} className="grid gap-3 rounded-lg border border-border bg-card p-4 md:grid-cols-2 xl:grid-cols-4">
      <div className="space-y-2">
        <Label htmlFor="branchId">Branch</Label>
        <select
          className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
          defaultValue={filters.branchId ?? ""}
          id="branchId"
          name="branchId"
        >
          <option value="">All branches</option>
          {branches.map((branch) => (
            <option key={branch.id} value={branch.id}>
              {branch.name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="departmentId">Department</Label>
        <select
          className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
          defaultValue={filters.departmentId ?? ""}
          id="departmentId"
          name="departmentId"
        >
          <option value="">All departments</option>
          {departments.map((department) => (
            <option key={department.id} value={department.id}>
              {department.name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="leaveTypeId">Leave type</Label>
        <select
          className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
          defaultValue={filters.leaveTypeId ?? ""}
          id="leaveTypeId"
          name="leaveTypeId"
        >
          <option value="">All leave types</option>
          {leaveTypes.map((type) => (
            <option key={type.id} value={type.id}>
              {type.name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="q">Employee search</Label>
        <input
          className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
          defaultValue={filters.employeeQuery ?? ""}
          id="q"
          name="q"
          placeholder="Name"
        />
      </div>

      <div className="flex flex-wrap items-center gap-4 md:col-span-2">
        <label className="flex items-center gap-2 text-sm">
          <input
            defaultChecked={filters.statuses?.includes("pending") ?? true}
            name="status"
            type="checkbox"
            value="pending"
          />
          Pending leave
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            defaultChecked={filters.statuses?.includes("approved") ?? true}
            name="status"
            type="checkbox"
            value="approved"
          />
          Approved leave
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input defaultChecked={filters.allBranches ?? false} name="allBranches" type="checkbox" value="true" />
          Show all branch holidays
        </label>
      </div>

      <div className="flex items-end gap-2 md:col-span-2 xl:col-span-4">
        <button className={cn(buttonVariants({ size: "sm" }))} type="submit">
          Apply filters
        </button>
        <Link
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          href={`${basePath}?year=${year}&month=${month}`}
        >
          Reset
        </Link>
        <Link
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
          href="/hr/organization/holidays"
        >
          Manage holidays
        </Link>
      </div>
    </form>
  );
}
