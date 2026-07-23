import Link from "next/link";

import { EmptyState, StatusPill } from "@hrms/ui";

import { DeleteEmployeeButton } from "@/components/hr/employees/delete-employee-button";
import { PortalAvatar } from "@/components/portal/portal-primitives";
import type {
  EmployeeBranchFilter,
  EmployeeDirectoryStats,
  EmployeeListItem,
} from "@/lib/employees/queries";

function statusTone(status: EmployeeListItem["displayStatus"]) {
  switch (status) {
    case "active":
      return "success" as const;
    case "on_leave":
      return "warning" as const;
    case "inactive":
      return "pending" as const;
    case "terminated":
      return "danger" as const;
  }
}

function statusLabel(status: EmployeeListItem["displayStatus"]) {
  switch (status) {
    case "on_leave":
      return "On leave";
    case "active":
      return "Active";
    case "inactive":
      return "Inactive";
    case "terminated":
      return "Terminated";
  }
}

function roleTone(role: EmployeeListItem["roleLabel"]) {
  switch (role) {
    case "Manager":
      return {
        className: "bg-[var(--success-soft)] text-[var(--success)]",
      };
    case "Admin":
    case "Owner":
      return {
        className: "bg-[var(--danger-soft)] text-[var(--danger)]",
      };
    default:
      return {
        className: "bg-[var(--surface-accent-soft)] text-[var(--accent-primary)]",
      };
  }
}

function formatJoined(value: string) {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function buildHref(params: {
  search?: string;
  status: string;
  branchId: string;
  page?: number;
}) {
  const query = new URLSearchParams();
  if (params.search?.trim()) query.set("search", params.search.trim());
  if (params.status !== "active") query.set("status", params.status);
  if (params.branchId !== "all") query.set("branchId", params.branchId);
  if (params.page && params.page > 1) query.set("page", String(params.page));
  const qs = query.toString();
  return qs ? `/hr/employees?${qs}` : "/hr/employees";
}

function MetricCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint: string;
}) {
  return (
    <div className="flex flex-col gap-0.5 rounded-[14px] border border-[var(--border-primary)] bg-[var(--surface-card)] px-3.5 py-3 shadow-[var(--shadow-card)]">
      <p className="text-xs font-medium text-[var(--foreground-muted)]">{label}</p>
      <p
        className="text-2xl font-semibold leading-none tracking-tight text-[var(--foreground-primary)]"
        style={{ fontFamily: "var(--font-geist-mono), ui-monospace, monospace" }}
      >
        {value}
      </p>
      <p className="text-[11px] text-[var(--foreground-muted)]">{hint}</p>
    </div>
  );
}

function FilterChip({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      className={`rounded-[8px] px-3 py-2 text-xs transition-colors ${
        active
          ? "bg-[var(--accent-primary)] font-semibold text-white"
          : "bg-[var(--surface-muted)] font-medium text-[var(--foreground-secondary)] hover:bg-[var(--surface-accent-soft)]"
      }`}
      href={href}
    >
      {label}
    </Link>
  );
}

export function EmployeeList({
  employees,
  search,
  status,
  branchId,
  total,
  page,
  pageSize,
  stats,
  branches,
  inactiveCount,
}: {
  employees: EmployeeListItem[];
  search?: string;
  status: string;
  branchId: string;
  total: number;
  page: number;
  pageSize: number;
  stats: EmployeeDirectoryStats;
  branches: EmployeeBranchFilter[];
  inactiveCount: number;
}) {
  const activeTotal = stats.active;
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const pages = Array.from({ length: Math.min(pageCount, 5) }, (_, index) => {
    if (pageCount <= 5) return index + 1;
    const start = Math.min(Math.max(1, page - 2), pageCount - 4);
    return start + index;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h2 className="text-base font-semibold text-[var(--foreground-primary)]">Employee directory</h2>
          <p className="max-w-[520px] text-[13px] text-[var(--foreground-muted)]">
            Create employees, edit roles, and manage employment status for the whole organization.
          </p>
        </div>
        <Link
          className="inline-flex h-10 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--accent-primary)] px-5 text-[15px] font-semibold text-white hover:bg-[var(--accent-hover)]"
          href="/hr/employees/create"
        >
          Create employee
        </Link>
      </div>

      <div className="grid gap-2.5 sm:grid-cols-3">
        <MetricCard hint="employees" label="Active" value={stats.active} />
        <MetricCard hint="today" label="On leave" value={stats.onLeave} />
        <MetricCard hint="pending" label="Invites open" value={stats.invitesOpen} />
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-1.5">
          <FilterChip
            active={status === "active" && branchId === "all"}
            href={buildHref({ search, status: "active", branchId: "all" })}
            label={`All (${activeTotal})`}
          />
          {branches.map((branch) => (
            <FilterChip
              active={status === "active" && branchId === branch.id}
              href={buildHref({ search, status: "active", branchId: branch.id })}
              key={branch.id}
              label={`${branch.name} (${branch.count})`}
            />
          ))}
          <FilterChip
            active={status === "inactive"}
            href={buildHref({ search, status: "inactive", branchId: "all" })}
            label={inactiveCount > 0 ? `Inactive (${inactiveCount})` : "Inactive"}
          />
        </div>

        <form className="flex h-9 w-full items-center gap-2 rounded-[8px] border border-[var(--border-primary)] bg-[var(--surface-muted)] px-3 lg:w-[240px]" method="get">
          {status !== "active" ? <input name="status" type="hidden" value={status} /> : null}
          {branchId !== "all" ? <input name="branchId" type="hidden" value={branchId} /> : null}
          <svg aria-hidden className="shrink-0 text-[var(--foreground-muted)]" fill="none" height="16" viewBox="0 0 24 24" width="16">
            <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.75" />
            <path d="m20 20-3.5-3.5" stroke="currentColor" strokeLinecap="round" strokeWidth="1.75" />
          </svg>
          <input
            className="h-full w-full bg-transparent text-[13px] text-[var(--foreground-primary)] outline-none placeholder:text-[var(--foreground-muted)]"
            defaultValue={search ?? ""}
            name="search"
            placeholder="Search name, email, or ID…"
            type="search"
          />
        </form>
      </div>

      <div className="overflow-hidden rounded-2xl border border-[var(--border-primary)] bg-[var(--surface-card)] shadow-[var(--shadow-card)]">
        <div className="hidden items-center gap-3 border-b border-[var(--border-primary)] bg-[var(--surface-muted)] px-3.5 py-3 text-[11px] font-semibold text-[var(--foreground-muted)] md:flex">
          <span className="w-[88px] shrink-0">Role</span>
          <span className="w-[196px] shrink-0">Employee</span>
          <span className="min-w-0 flex-1">Branch / Dept</span>
          <span className="w-[100px] shrink-0">Joined</span>
          <span className="w-[96px] shrink-0">Status</span>
          <span className="w-[156px] shrink-0 text-right">Action</span>
        </div>

        {employees.length === 0 ? (
          <div className="p-6">
            <EmptyState
              action={
                <Link
                  className="inline-flex h-10 items-center rounded-[var(--radius-sm)] bg-[var(--accent-primary)] px-5 text-sm font-semibold text-white hover:bg-[var(--accent-hover)]"
                  href="/hr/employees/create"
                >
                  Create employee
                </Link>
              }
              description={
                search
                  ? "Try a different search term or clear filters."
                  : "Create your first employee to start building the directory."
              }
              title={search ? "No employees match your search" : "No employees yet"}
            />
          </div>
        ) : (
          <div className="divide-y divide-[var(--border-primary)]">
            {employees.map((employee) => {
              const role = roleTone(employee.roleLabel);
              const assignment = [employee.branchName, employee.departmentName].filter(Boolean).join(" · ") || "Unassigned";

              return (
                <div
                  className="flex flex-col gap-3 px-3.5 py-3 md:flex-row md:items-center md:gap-3"
                  key={employee.id}
                >
                  <div className="w-full md:w-[88px] md:shrink-0">
                    <span className={`inline-flex rounded-full px-2 py-1 text-[11px] font-semibold ${role.className}`}>
                      {employee.roleLabel}
                    </span>
                  </div>

                  <div className="flex min-w-0 w-full items-center gap-2 md:w-[196px] md:shrink-0">
                    <PortalAvatar email={employee.email} name={employee.fullName} />
                    <div className="min-w-0">
                      <Link
                        className="truncate text-[13px] font-semibold text-[var(--foreground-primary)] hover:text-[var(--accent-primary)]"
                        href={`/hr/employees/${employee.id}`}
                      >
                        {employee.fullName}
                      </Link>
                      <p className="truncate text-[11px] text-[var(--foreground-muted)]">{employee.employeeNumber}</p>
                    </div>
                  </div>

                  <p className="min-w-0 flex-1 text-[13px] font-medium text-[var(--foreground-secondary)]">{assignment}</p>
                  <p className="w-full text-xs text-[var(--foreground-muted)] md:w-[100px] md:shrink-0">
                    {formatJoined(employee.joinDate)}
                  </p>
                  <div className="w-full md:w-[96px] md:shrink-0">
                    <StatusPill label={statusLabel(employee.displayStatus)} tone={statusTone(employee.displayStatus)} />
                  </div>
                  <div className="flex w-full items-center justify-start gap-2 md:w-[156px] md:shrink-0 md:justify-end">
                    <Link
                      aria-label={`View employee dossier for ${employee.fullName}`}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-[8px] border border-[var(--border-primary)] bg-[var(--surface-muted)] text-[var(--danger)] hover:bg-[var(--danger-soft)]"
                      href={`/hr/employees/${employee.id}/dossier`}
                      title="Employee dossier PDF"
                    >
                      <svg aria-hidden fill="none" height="16" viewBox="0 0 24 24" width="16">
                        <path
                          d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
                          stroke="currentColor"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="1.75"
                        />
                        <path
                          d="M14 2v6h6M9.5 13h5M9.5 17h5M9.5 9H12"
                          stroke="currentColor"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="1.75"
                        />
                      </svg>
                    </Link>
                    <DeleteEmployeeButton
                      employeeId={employee.id}
                      employeeName={employee.fullName}
                      variant="icon"
                    />
                    <Link
                      className="inline-flex h-8 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--border-primary)] bg-[var(--surface-card)] px-3 text-xs font-medium text-[var(--foreground-primary)] hover:bg-[var(--surface-muted)]"
                      href={`/hr/employees/${employee.id}/edit`}
                    >
                      Edit
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[13px] text-[var(--foreground-muted)]">
          Showing {from}–{to} of {total} employees
        </p>
        <div className="flex items-center gap-1">
          <Link
            aria-disabled={page <= 1}
            className={`inline-flex h-8 w-8 items-center justify-center rounded-[8px] border border-[var(--border-primary)] text-sm ${
              page <= 1
                ? "pointer-events-none text-[var(--foreground-muted)] opacity-40"
                : "text-[var(--foreground-secondary)] hover:bg-[var(--surface-muted)]"
            }`}
            href={buildHref({ search, status, branchId, page: page - 1 })}
          >
            ‹
          </Link>
          {pages.map((pageNumber) => (
            <Link
              className={`inline-flex h-8 min-w-8 items-center justify-center rounded-[8px] px-2 text-sm font-medium ${
                pageNumber === page
                  ? "bg-[var(--accent-primary)] text-white"
                  : "border border-[var(--border-primary)] text-[var(--foreground-secondary)] hover:bg-[var(--surface-muted)]"
              }`}
              href={buildHref({ search, status, branchId, page: pageNumber })}
              key={pageNumber}
            >
              {pageNumber}
            </Link>
          ))}
          <Link
            aria-disabled={page >= pageCount}
            className={`inline-flex h-8 w-8 items-center justify-center rounded-[8px] border border-[var(--border-primary)] text-sm ${
              page >= pageCount
                ? "pointer-events-none text-[var(--foreground-muted)] opacity-40"
                : "text-[var(--foreground-secondary)] hover:bg-[var(--surface-muted)]"
            }`}
            href={buildHref({ search, status, branchId, page: page + 1 })}
          >
            ›
          </Link>
        </div>
      </div>
    </div>
  );
}
