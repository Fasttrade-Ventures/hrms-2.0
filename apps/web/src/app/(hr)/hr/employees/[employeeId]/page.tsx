import Link from "next/link";
import { notFound } from "next/navigation";

import { StatusPill } from "@hrms/ui";

import { DeleteEmployeeButton } from "@/components/hr/employees/delete-employee-button";
import { PortalAvatar, PortalPageHeader } from "@/components/portal/portal-primitives";
import { requireRole } from "@/lib/auth/session";
import { getEmployeeDetail } from "@/lib/employees/queries";

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--foreground-muted)]">{label}</p>
      <p className="text-sm text-[var(--foreground-primary)]">{value}</p>
    </div>
  );
}

export default async function ViewEmployeePage({
  params,
}: {
  params: Promise<{ employeeId: string }>;
}) {
  await requireRole("hr_administrator");

  const { employeeId } = await params;
  const employee = await getEmployeeDetail(employeeId);

  if (!employee) {
    notFound();
  }

  const assignment =
    [employee.branchName, employee.departmentName].filter(Boolean).join(" · ") || "Unassigned";

  return (
    <div className="space-y-4">
      <PortalPageHeader
        actions={
          <div className="flex flex-wrap gap-2">
            <Link
              className="inline-flex h-10 items-center rounded-[var(--radius-sm)] border border-[var(--border-primary)] bg-[var(--surface-card)] px-4 text-sm font-medium hover:bg-[var(--surface-muted)]"
              href="/hr/employees"
            >
              Back to list
            </Link>
            <Link
              className="inline-flex h-10 items-center rounded-[var(--radius-sm)] border border-[var(--border-primary)] bg-[var(--surface-card)] px-4 text-sm font-medium hover:bg-[var(--surface-muted)]"
              href={`/hr/employees/${employee.id}/dossier`}
            >
              View dossier
            </Link>
            <DeleteEmployeeButton employeeId={employee.id} employeeName={employee.fullName} />
            <Link
              className="inline-flex h-10 items-center rounded-[var(--radius-sm)] bg-[var(--accent-primary)] px-4 text-sm font-semibold text-white hover:bg-[var(--accent-hover)]"
              href={`/hr/employees/${employee.id}/edit`}
            >
              Edit employee
            </Link>
          </div>
        }
        description={`${employee.employeeNumber} · ${employee.email}`}
        title={employee.fullName}
      />

      <div className="overflow-hidden rounded-2xl border border-[var(--border-primary)] bg-[var(--surface-card)] shadow-[var(--shadow-card)]">
        <div className="flex flex-col gap-4 border-b border-[var(--border-primary)] bg-[var(--surface-muted)] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <PortalAvatar email={employee.email} name={employee.fullName} />
            <div>
              <p className="text-base font-semibold text-[var(--foreground-primary)]">{employee.fullName}</p>
              <p className="text-sm text-[var(--foreground-muted)]">{assignment}</p>
            </div>
          </div>
          <StatusPill
            label={employee.status === "active" ? "Active" : employee.status}
            tone={employee.status === "active" ? "success" : "warning"}
          />
        </div>

        <div className="grid gap-6 p-5 md:grid-cols-2">
          <section className="space-y-4">
            <h3 className="text-sm font-semibold text-[var(--foreground-primary)]">Employment</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Employee no." value={employee.employeeNumber} />
              <Field label="Joined" value={formatDate(employee.joinDate)} />
              <Field label="Manager" value={employee.managerName ?? "—"} />
              <Field label="Roles" value={employee.membership?.roles?.join(", ") || "employee"} />
            </div>
          </section>

          <section className="space-y-4">
            <h3 className="text-sm font-semibold text-[var(--foreground-primary)]">Contact</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Email" value={employee.email} />
              <Field label="Phone" value={employee.profile.phone ?? "—"} />
              <Field label="IC / Passport" value={employee.profile.icNumber ?? "—"} />
              <Field
                label="Basic salary"
                value={`RM ${employee.profile.basicSalary.toLocaleString("en-MY", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}`}
              />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
