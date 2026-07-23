import Link from "next/link";
import { notFound } from "next/navigation";

import { StatusPill } from "@hrms/ui";

import { PortalPageHeader } from "@/components/portal/portal-primitives";
import { requireRole } from "@/lib/auth/session";
import { getEmployeeDossier } from "@/lib/employees/dossier";

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

export default async function EmployeeDossierPage({
  params,
}: {
  params: Promise<{ employeeId: string }>;
}) {
  await requireRole("hr_administrator");

  const { employeeId } = await params;
  const employee = await getEmployeeDossier(employeeId);

  if (!employee) {
    notFound();
  }

  return (
    <div className="space-y-4">
      <PortalPageHeader
        actions={
          <div className="flex flex-wrap gap-2">
            <Link
              className="inline-flex h-10 items-center rounded-[var(--radius-sm)] border border-[var(--border-primary)] bg-[var(--surface-card)] px-4 text-sm font-medium text-[var(--foreground-primary)] hover:bg-[var(--surface-muted)]"
              href={`/hr/employees/${employee.id}/edit`}
            >
              Edit employee
            </Link>
            <a
              className="inline-flex h-10 items-center rounded-[var(--radius-sm)] bg-[var(--accent-primary)] px-4 text-sm font-semibold text-white hover:bg-[var(--accent-hover)]"
              download
              href={`/hr/employees/${employee.id}/dossier/pdf?download=1`}
            >
              Download PDF
            </a>
          </div>
        }
        description={`${employee.employeeNumber} · ${employee.email}`}
        title="Employee dossier"
      />

      <div className="overflow-hidden rounded-2xl border border-[var(--border-primary)] bg-[var(--surface-card)] shadow-[var(--shadow-card)]">
        <div className="flex flex-col gap-3 border-b border-[var(--border-primary)] bg-[var(--surface-muted)] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[var(--foreground-primary)]">{employee.fullName}</h2>
            <p className="text-sm text-[var(--foreground-muted)]">
              {[employee.branchName, employee.departmentName].filter(Boolean).join(" · ") || "Unassigned"}
            </p>
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
            <h3 className="text-sm font-semibold text-[var(--foreground-primary)]">Personal</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Phone" value={employee.profile.phone ?? "—"} />
              <Field label="IC / Passport" value={employee.profile.icNumber ?? "—"} />
            </div>
          </section>

          <section className="space-y-4 md:col-span-2">
            <h3 className="text-sm font-semibold text-[var(--foreground-primary)]">Address</h3>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Line 1" value={employee.profile.addressLine1 ?? "—"} />
              <Field label="Line 2" value={employee.profile.addressLine2 ?? "—"} />
              <Field label="City" value={employee.profile.city ?? "—"} />
              <Field label="State" value={employee.profile.state ?? "—"} />
              <Field label="Postcode" value={employee.profile.postcode ?? "—"} />
              <Field label="Country" value={employee.profile.country ?? "—"} />
            </div>
          </section>

          <section className="space-y-4 md:col-span-2">
            <h3 className="text-sm font-semibold text-[var(--foreground-primary)]">Bank & statutory</h3>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Bank" value={employee.profile.bankName ?? "—"} />
              <Field label="Account" value={employee.profile.bankAccountNumber ?? "—"} />
              <Field label="EPF" value={employee.profile.epfNumber ?? "—"} />
              <Field label="SOCSO" value={employee.profile.socsoNumber ?? "—"} />
              <Field label="Tax" value={employee.profile.taxNumber ?? "—"} />
              <Field
                label="Basic salary"
                value={`RM ${employee.profile.basicSalary.toLocaleString("en-MY", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}`}
              />
            </div>
          </section>

          <section className="space-y-4 md:col-span-2">
            <h3 className="text-sm font-semibold text-[var(--foreground-primary)]">Emergency contacts</h3>
            {employee.emergencyContacts.length === 0 ? (
              <p className="text-sm text-[var(--foreground-muted)]">None on file.</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {employee.emergencyContacts.map((contact) => (
                  <div
                    className="rounded-[12px] border border-[var(--border-primary)] bg-[var(--surface-muted)] px-4 py-3"
                    key={contact.id}
                  >
                    <p className="text-sm font-semibold text-[var(--foreground-primary)]">{contact.name}</p>
                    <p className="text-xs text-[var(--foreground-muted)]">
                      {contact.relationship ?? "Contact"} · {contact.phone}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border-primary)] px-5 py-4">
          <a
            className="inline-flex items-center gap-2 text-sm font-medium text-[var(--accent-primary)] hover:text-[var(--accent-hover)]"
            href={`/hr/employees/${employee.id}/dossier/pdf`}
            rel="noreferrer"
            target="_blank"
          >
            Open PDF in new tab
          </a>
          <a
            className="inline-flex h-10 items-center rounded-[var(--radius-sm)] border border-[var(--border-primary)] bg-[var(--surface-card)] px-4 text-sm font-medium text-[var(--foreground-primary)] hover:bg-[var(--surface-muted)]"
            download
            href={`/hr/employees/${employee.id}/dossier/pdf?download=1`}
          >
            Download PDF
          </a>
        </div>
      </div>
    </div>
  );
}
