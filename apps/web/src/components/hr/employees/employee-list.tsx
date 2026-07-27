import Link from "next/link";

import { EmptyState } from "@hrms/ui";

import { DeleteEmployeeButton } from "@/components/hr/employees/delete-employee-button";
import { EmployeeDirectoryFilters } from "@/components/hr/employees/employee-directory-filters";
import {
  HrLinkButton,
  HrPagination,
} from "@/components/hr/hr-ui.client";
import {
  HrStatCards,
  HrTableCard,
} from "@/components/hr/hr-ui";
import { PortalAvatar } from "@/components/portal/portal-primitives";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type {
  EmployeeBranchFilter,
  EmployeeDirectoryStats,
  EmployeeListItem,
} from "@/lib/employees/queries";

const DIRECTORY_GRID =
  "md:grid md:grid-cols-[72px_minmax(160px,1.2fr)_minmax(100px,0.9fr)_minmax(120px,1fr)_88px_88px_88px_140px] md:items-center md:gap-3";

function statusVariant(status: EmployeeListItem["displayStatus"]) {
  switch (status) {
    case "active":
      return "secondary" as const;
    case "on_leave":
      return "outline" as const;
    case "inactive":
      return "outline" as const;
    case "terminated":
      return "destructive" as const;
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

function roleVariant(role: EmployeeListItem["roleLabel"]) {
  switch (role) {
    case "Manager":
      return "secondary" as const;
    case "Admin":
    case "Owner":
      return "destructive" as const;
    default:
      return "default" as const;
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
          <h2 className="text-base font-semibold text-foreground">Employee directory</h2>
          <p className="max-w-[520px] text-[13px] text-muted-foreground">
            Create employees, edit roles, and manage employment status for the whole organization.
          </p>
        </div>
        <HrLinkButton href="/hr/employees/create">Create employee</HrLinkButton>
      </div>

      <HrStatCards
        items={[
          { hint: "employees", label: "Active", value: stats.active },
          { hint: "today", label: "On leave", value: stats.onLeave },
          { hint: "pending", label: "Invites open", value: stats.invitesOpen },
        ]}
      />

      <EmployeeDirectoryFilters
        activeTotal={activeTotal}
        branchId={branchId}
        branches={branches}
        inactiveCount={inactiveCount}
        search={search}
        status={status}
      />

      <HrTableCard>
        <div
          className={`hidden border-b bg-muted/50 px-3.5 py-3 text-[11px] font-semibold text-muted-foreground ${DIRECTORY_GRID}`}
        >
          <span>Role</span>
          <span>Employee</span>
          <span>Job title</span>
          <span>Branch / Dept</span>
          <span>Joined</span>
          <span>Login</span>
          <span>Status</span>
          <span className="text-right">Action</span>
        </div>

        {employees.length === 0 ? (
          <div className="p-6">
            <EmptyState
              action={<HrLinkButton href="/hr/employees/create">Create employee</HrLinkButton>}
              description={
                search
                  ? "Try a different search term or clear filters."
                  : "Create your first employee to start building the directory."
              }
              title={search ? "No employees match your search" : "No employees yet"}
            />
          </div>
        ) : (
          <div className="divide-y divide-border">
            {employees.map((employee) => {
              const assignment =
                [employee.branchName, employee.departmentName].filter(Boolean).join(" · ") ||
                "Unassigned";

              return (
                <div className={`flex flex-col gap-3 px-3.5 py-3 ${DIRECTORY_GRID}`} key={employee.id}>
                  <div>
                    <Badge variant={roleVariant(employee.roleLabel)}>{employee.roleLabel}</Badge>
                  </div>

                  <div className="flex min-w-0 items-center gap-2">
                    <PortalAvatar
                      email={employee.email}
                      name={employee.fullName}
                      photoUrl={employee.profilePhotoUrl}
                    />
                    <div className="min-w-0">
                      <Link
                        className="block truncate text-[13px] font-semibold text-foreground hover:text-primary"
                        href={`/hr/employees/${employee.id}`}
                      >
                        {employee.fullName}
                      </Link>
                      <p className="truncate text-[11px] text-muted-foreground">
                        {employee.employeeNumber}
                      </p>
                      <p className="truncate text-[11px] text-muted-foreground">{employee.email}</p>
                    </div>
                  </div>

                  <p className="min-w-0 truncate text-[13px] font-medium text-muted-foreground">
                    {employee.jobTitle || "—"}
                  </p>
                  <p className="min-w-0 truncate text-[13px] font-medium text-muted-foreground">
                    {assignment}
                  </p>
                  <p className="text-xs text-muted-foreground">{formatJoined(employee.joinDate)}</p>
                  <div>
                    <Badge variant={employee.hasLogin ? "secondary" : "outline"}>
                      {employee.hasLogin ? "Has login" : "Invite pending"}
                    </Badge>
                  </div>
                  <div>
                    <Badge variant={statusVariant(employee.displayStatus)}>
                      {statusLabel(employee.displayStatus)}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-start gap-2 md:justify-end">
                    <Button
                      aria-label={`View employee dossier for ${employee.fullName}`}
                      render={<Link href={`/hr/employees/${employee.id}/dossier`} />}
                      size="icon-sm"
                      title="Employee dossier PDF"
                      variant="outline"
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
                    </Button>
                    <DeleteEmployeeButton
                      employeeId={employee.id}
                      employeeName={employee.fullName}
                      variant="icon"
                    />
                    <HrLinkButton href={`/hr/employees/${employee.id}/edit`} size="sm" variant="outline">
                      Edit
                    </HrLinkButton>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </HrTableCard>

      <HrPagination
        from={from}
        itemLabel="employees"
        nextHref={
          page < pageCount ? buildHref({ search, status, branchId, page: page + 1 }) : undefined
        }
        page={page}
        pageLinks={pages.map((pageNumber) => ({
          page: pageNumber,
          href: buildHref({ search, status, branchId, page: pageNumber }),
        }))}
        prevHref={page > 1 ? buildHref({ search, status, branchId, page: page - 1 }) : undefined}
        to={to}
        total={total}
      />
    </div>
  );
}
