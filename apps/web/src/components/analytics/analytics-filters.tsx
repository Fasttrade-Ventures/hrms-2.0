"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";

import type { AnalyticsPeriod } from "@/lib/analytics/period";

export type FilterOption = { id: string; name: string };

export function AnalyticsFilters({
  period,
  branchId,
  departmentId,
  branches,
  departments,
}: {
  period: AnalyticsPeriod;
  branchId: string | null;
  departmentId: string | null;
  branches: FilterOption[];
  departments: FilterOption[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function update(next: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(next)) {
      if (!value) params.delete(key);
      else params.set(key, value);
    }
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-xl border border-[var(--border-primary)] bg-[var(--surface-card)] p-4">
      <label className="space-y-1 text-sm">
        <span className="text-muted-foreground">Period</span>
        <select
          className="block h-10 min-w-[10rem] rounded-lg border border-input bg-background px-3 text-sm"
          onChange={(event) => update({ period: event.target.value })}
          value={period}
        >
          <option value="month">This month</option>
          <option value="6m">Last 6 months</option>
          <option value="ytd">Year to date</option>
        </select>
      </label>
      <label className="space-y-1 text-sm">
        <span className="text-muted-foreground">Branch</span>
        <select
          className="block h-10 min-w-[12rem] rounded-lg border border-input bg-background px-3 text-sm"
          onChange={(event) => update({ branchId: event.target.value || null })}
          value={branchId ?? ""}
        >
          <option value="">All branches</option>
          {branches.map((branch) => (
            <option key={branch.id} value={branch.id}>
              {branch.name}
            </option>
          ))}
        </select>
      </label>
      <label className="space-y-1 text-sm">
        <span className="text-muted-foreground">Department</span>
        <select
          className="block h-10 min-w-[12rem] rounded-lg border border-input bg-background px-3 text-sm"
          onChange={(event) => update({ departmentId: event.target.value || null })}
          value={departmentId ?? ""}
        >
          <option value="">All departments</option>
          {departments.map((department) => (
            <option key={department.id} value={department.id}>
              {department.name}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
