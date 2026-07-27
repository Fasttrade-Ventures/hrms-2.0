import Link from "next/link";

import { HrLinkButton } from "@/components/hr/hr-ui.client";
import type { AssetRegisterFilters } from "@/lib/assets/types";
import { buildAssetRegisterHref } from "@/lib/assets/parse-filters";

export function AssetRegisterFilters({
  filters,
  categories,
  branches,
  employees,
}: {
  filters: AssetRegisterFilters;
  categories: Array<{ id: string; name: string }>;
  branches: Array<{ id: string; name: string }>;
  employees: Array<{ id: string; full_name: string; employee_number: string }>;
}) {
  return (
    <form action="/hr/assets" className="grid gap-3 rounded-xl border bg-card p-4 md:grid-cols-3 lg:grid-cols-6" method="get">
      <label className="space-y-1 text-sm">
        <span className="font-medium">Search</span>
        <input
          className="w-full rounded-md border px-3 py-2"
          defaultValue={filters.q ?? ""}
          name="q"
          placeholder="Name, serial…"
        />
      </label>
      <label className="space-y-1 text-sm">
        <span className="font-medium">Status</span>
        <select className="w-full rounded-md border px-3 py-2" defaultValue={filters.status ?? ""} name="status">
          <option value="">All</option>
          <option value="available">Available</option>
          <option value="assigned">Assigned</option>
          <option value="returned">Returned</option>
          <option value="disposed">Disposed</option>
        </select>
      </label>
      <label className="space-y-1 text-sm">
        <span className="font-medium">Category</span>
        <select className="w-full rounded-md border px-3 py-2" defaultValue={filters.categoryId ?? ""} name="categoryId">
          <option value="">All</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </label>
      <label className="space-y-1 text-sm">
        <span className="font-medium">Branch</span>
        <select className="w-full rounded-md border px-3 py-2" defaultValue={filters.branchId ?? ""} name="branchId">
          <option value="">All</option>
          {branches.map((branch) => (
            <option key={branch.id} value={branch.id}>
              {branch.name}
            </option>
          ))}
        </select>
      </label>
      <label className="space-y-1 text-sm">
        <span className="font-medium">Assignee</span>
        <select className="w-full rounded-md border px-3 py-2" defaultValue={filters.assigneeId ?? ""} name="assigneeId">
          <option value="">All</option>
          <option value="unassigned">Unassigned</option>
          {employees.map((employee) => (
            <option key={employee.id} value={employee.id}>
              {employee.employee_number} · {employee.full_name}
            </option>
          ))}
        </select>
      </label>
      <div className="flex items-end gap-2">
        <button className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground" type="submit">
          Apply
        </button>
        <HrLinkButton href={buildAssetRegisterHref({})} variant="outline">
          Reset
        </HrLinkButton>
      </div>
    </form>
  );
}

export function AssetStatusBadge({ status }: { status: string }) {
  const tone =
    status === "assigned"
      ? "bg-primary/10 text-primary"
      : status === "available"
        ? "bg-muted text-muted-foreground"
        : status === "returned"
          ? "bg-amber-500/10 text-amber-700"
          : "bg-destructive/10 text-destructive";

  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${tone}`}>{status}</span>;
}
