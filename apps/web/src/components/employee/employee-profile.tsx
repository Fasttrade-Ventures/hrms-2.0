import Link from "next/link";

import { PortalPageHeader } from "@/components/portal/portal-primitives";

export function EmployeeProfileTabs({
  active,
}: {
  active: "personal" | "address" | "payroll" | "security";
}) {
  const tabs = [
    { id: "personal" as const, label: "Personal", href: "/employee/profile" },
    { id: "address" as const, label: "Address", href: "/employee/profile/address" },
    { id: "payroll" as const, label: "Payroll", href: "/employee/profile/payroll" },
    { id: "security" as const, label: "Security", href: "/employee/profile/security" },
  ];

  return (
    <div className="flex flex-wrap gap-2 border-b border-[var(--border-primary)]">
      {tabs.map((tab) => (
        <Link
          className={`px-4 py-3 text-sm font-medium ${
            active === tab.id
              ? "border-b-2 border-[var(--accent-primary)] text-[var(--accent-primary)]"
              : "text-[var(--foreground-secondary)] hover:text-[var(--foreground-primary)]"
          }`}
          href={tab.href}
          key={tab.id}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}

export function EmployeeInfoCard({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div className="space-y-1">
      <p className="text-[13px] font-medium text-[var(--foreground-muted)]">{label}</p>
      <p className="text-sm text-[var(--foreground-primary)]">{value?.trim() || "—"}</p>
    </div>
  );
}

export function EmployeeProfileHeader({
  fullName,
  email,
  employeeNumber,
  departmentName,
  branchName,
}: {
  fullName: string;
  email: string;
  employeeNumber: string;
  departmentName: string | null;
  branchName: string | null;
}) {
  return (
    <PortalPageHeader
      description={[employeeNumber, email, departmentName, branchName].filter(Boolean).join(" · ")}
      title={fullName}
    />
  );
}
