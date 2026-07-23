import Link from "next/link";

import { EmptyState, ListCard, StatusPill } from "@hrms/ui";

import { PortalPageHeader } from "@/components/portal/portal-primitives";
import type { EmployeeListItem } from "@/lib/employees/queries";

function statusTone(status: EmployeeListItem["status"]) {
  switch (status) {
    case "active":
      return "success" as const;
    case "inactive":
      return "warning" as const;
    case "terminated":
      return "danger" as const;
  }
}

export function EmployeeList({
  employees,
  search,
  status,
}: {
  employees: EmployeeListItem[];
  search?: string;
  status: string;
}) {
  return (
    <div className="space-y-6">
      <PortalPageHeader
        actions={
          <Link
            className="inline-flex h-11 items-center bg-[var(--accent-primary)] px-5 text-sm font-semibold text-white hover:bg-[var(--accent-hover)]"
            href="/hr/employees/create"
          >
            Create employee
          </Link>
        }
        description="Create employees, manage profiles, and send activation emails."
        title="Employees"
      />

      <form className="grid gap-3 border border-[var(--border-primary)] bg-[var(--surface-card)] p-4 md:grid-cols-[1fr_180px_auto]" method="get">
        <input
          className="h-11 border border-[var(--border-primary)] bg-[var(--surface-card)] px-3.5 text-sm outline-none focus:border-[var(--border-focus)]"
          defaultValue={search ?? ""}
          name="search"
          placeholder="Search name, email, or employee number"
          type="search"
        />
        <select
          className="h-11 border border-[var(--border-primary)] bg-[var(--surface-card)] px-3.5 text-sm outline-none focus:border-[var(--border-focus)]"
          defaultValue={status}
          name="status"
        >
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="terminated">Terminated</option>
          <option value="all">All statuses</option>
        </select>
        <button
          className="h-11 bg-[var(--accent-primary)] px-5 text-sm font-semibold text-white hover:bg-[var(--accent-hover)]"
          type="submit"
        >
          Filter
        </button>
      </form>

      <ListCard
        columns={[
          { key: "employee", label: "Employee" },
          { key: "assignment", label: "Assignment", className: "hidden lg:block flex-1" },
          { key: "status", label: "Status", className: "w-28" },
        ]}
        empty={
          <EmptyState
            action={
              <Link
                className="inline-flex h-11 items-center bg-[var(--accent-primary)] px-5 text-sm font-semibold text-white hover:bg-[var(--accent-hover)]"
                href="/hr/employees/create"
              >
                Create employee
              </Link>
            }
            description={
              search
                ? "Try a different search term or clear filters."
                : "Create your first employee to start onboarding staff."
            }
            title={search ? "No employees match your search" : "No employees yet"}
          />
        }
        header={<p className="text-sm font-medium text-[var(--foreground-primary)]">{employees.length} employees</p>}
        rows={employees.map((employee) => ({
          id: employee.id,
          cells: {
            employee: (
              <div>
                <Link
                  className="font-medium text-[var(--foreground-primary)] hover:text-[var(--accent-primary)]"
                  href={`/hr/employees/${employee.id}`}
                >
                  {employee.fullName}
                </Link>
                <p className="text-sm text-[var(--foreground-muted)]">{employee.email}</p>
                <p className="text-xs text-[var(--foreground-secondary)]">{employee.employeeNumber}</p>
              </div>
            ),
            assignment: (
              <div className="text-sm text-[var(--foreground-secondary)]">
                <p>{employee.branchName ?? "No branch"}</p>
                <p>{employee.departmentName ?? "No department"}</p>
              </div>
            ),
            status: <StatusPill label={employee.status} tone={statusTone(employee.status)} />,
          },
          action: (
            <Link
              className="text-sm font-medium text-[var(--accent-primary)] hover:text-[var(--accent-hover)]"
              href={`/hr/employees/${employee.id}`}
            >
              View
            </Link>
          ),
        }))}
      />
    </div>
  );
}
