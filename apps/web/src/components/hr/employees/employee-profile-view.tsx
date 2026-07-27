import type { ReactNode } from "react";

import { PortalAvatar } from "@/components/portal/portal-primitives";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  formatAddress,
  formatConfirmationStatus,
  formatCurrency,
  formatEmploymentType,
  formatGender,
  formatMaritalStatus,
  formatPayBasis,
  formatPortalRole,
  formatProfileDate,
  tenureLabel,
} from "@/lib/employees/display-labels";
import type { EmployeeDetail } from "@/lib/employees/queries";

function ProfileField({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-sm text-foreground">{value || "—"}</p>
    </div>
  );
}

function ProfileStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-muted/40 px-3 py-2.5">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-base font-semibold text-foreground">{value}</p>
    </div>
  );
}

function ProfileSection({
  title,
  children,
  className,
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-xl border bg-card p-4 ring-1 ring-foreground/10",
        className,
      )}
    >
      <h3 className="mb-3 text-sm font-semibold text-foreground">{title}</h3>
      {children}
    </section>
  );
}

function SubPanel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-lg border bg-muted/30 p-3">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
      {children}
    </div>
  );
}

export function EmployeeProfileView({ employee }: { employee: EmployeeDetail }) {
  const assignment =
    [employee.branchName, employee.departmentName].filter(Boolean).join(" · ") || "Unassigned";
  const spouse = employee.dependents.find((item) => item.dependentType === "spouse");
  const children = employee.dependents.filter((item) => item.dependentType === "child");
  const hasLogin = Boolean(employee.membership?.userId);

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-4 border-b pb-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex min-w-0 items-start gap-4">
              <PortalAvatar
                email={employee.email}
                name={employee.fullName}
                photoUrl={employee.profile.profilePhotoUrl}
                size="lg"
              />
              <div className="min-w-0 space-y-1">
                <h2 className="text-xl font-semibold text-foreground">{employee.fullName}</h2>
                <p className="text-sm text-muted-foreground">
                  {employee.jobTitle?.trim() || "No job title"} · {employee.employeeNumber}
                </p>
                <p className="text-sm text-muted-foreground">{assignment}</p>
                <p className="truncate text-sm text-muted-foreground">{employee.email}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant={employee.status === "active" ? "secondary" : "outline"}>
                {employee.status === "active" ? "Active" : employee.status}
              </Badge>
              <Badge variant={hasLogin ? "secondary" : "outline"}>
                {hasLogin ? "Login linked" : "No login"}
              </Badge>
              <Badge variant="outline">{formatConfirmationStatus(employee.confirmationStatus)}</Badge>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <ProfileStat label="Joined" value={formatProfileDate(employee.joinDate)} />
            <ProfileStat label="Tenure" value={tenureLabel(employee.joinDate)} />
            <ProfileStat
              label="Annual leave"
              value={`${employee.annualLeaveEntitlement} days`}
            />
            <ProfileStat
              label="Employment"
              value={formatEmploymentType(employee.employmentType)}
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <ProfileSection title="Employment">
          <div className="grid gap-4 sm:grid-cols-2">
            <ProfileField label="Staff ID" value={employee.employeeNumber} />
            <ProfileField label="Join date" value={formatProfileDate(employee.joinDate)} />
            <ProfileField label="Job title" value={employee.jobTitle ?? "—"} />
            <ProfileField
              label="Employment type"
              value={formatEmploymentType(employee.employmentType)}
            />
            <ProfileField label="Branch" value={employee.branchName ?? "—"} />
            <ProfileField label="Department" value={employee.departmentName ?? "—"} />
            <ProfileField label="Manager" value={employee.managerName ?? "—"} />
            <ProfileField label="Shift" value={employee.shiftName ?? "—"} />
            <ProfileField label="Pay group" value={employee.payGroupName ?? "Default"} />
            <ProfileField
              label="Portal role"
              value={formatPortalRole(employee.membership?.roles)}
            />
            <ProfileField
              label="AL entitlement"
              value={`${employee.annualLeaveEntitlement} days`}
            />
            <ProfileField
              label="Carry forward"
              value={`${employee.annualLeaveCarryForward} days`}
            />
          </div>
        </ProfileSection>

        <ProfileSection title="Personal">
          <div className="grid gap-4 sm:grid-cols-2">
            <ProfileField label="Mobile" value={employee.profile.phone ?? "—"} />
            <ProfileField label="NRIC no" value={employee.profile.icNumber ?? "—"} />
            <ProfileField label="Date of birth" value={formatProfileDate(employee.profile.dateOfBirth)} />
            <ProfileField label="Gender" value={formatGender(employee.profile.gender)} />
            <ProfileField label="Race" value={employee.profile.race ?? "—"} />
            <ProfileField label="Religion" value={employee.profile.religion ?? "—"} />
            <ProfileField
              label="Marital status"
              value={formatMaritalStatus(employee.profile.maritalStatus)}
            />
            <ProfileField
              label="Confirmation"
              value={formatConfirmationStatus(employee.confirmationStatus)}
            />
          </div>
        </ProfileSection>

        <ProfileSection className="lg:col-span-2" title="Address">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <ProfileField label="Address line 1" value={employee.profile.addressLine1 ?? "—"} />
            <ProfileField label="Address line 2" value={employee.profile.addressLine2 ?? "—"} />
            <ProfileField label="City" value={employee.profile.city ?? "—"} />
            <ProfileField label="State" value={employee.profile.state ?? "—"} />
            <ProfileField label="Postcode" value={employee.profile.postcode ?? "—"} />
            <ProfileField
              label="Country"
              value={employee.profile.country === "MY" ? "Malaysia" : employee.profile.country ?? "—"}
            />
          </div>
          <p className="mt-4 text-sm text-muted-foreground">{formatAddress(employee.profile)}</p>
        </ProfileSection>

        <ProfileSection title="Payroll & statutory">
          <div className="grid gap-4 sm:grid-cols-2">
            <ProfileField label="Pay basis" value={formatPayBasis(employee.profile.payBasis)} />
            <ProfileField
              label="Basic salary"
              value={formatCurrency(employee.profile.basicSalary)}
            />
            <ProfileField
              label="Working days / month"
              value={String(employee.profile.workingDaysPerMonth)}
            />
            <ProfileField label="Bank" value={employee.profile.bankName ?? "—"} />
            <ProfileField label="Account no" value={employee.profile.bankAccountNumber ?? "—"} />
            <ProfileField label="EPF no" value={employee.profile.epfNumber ?? "—"} />
            <ProfileField
              label="EPF employee rate"
              value={`${employee.profile.epfEmployeeRate}%`}
            />
            <ProfileField
              label="EPF employer rate"
              value={`${employee.profile.epfEmployerRate}%`}
            />
            <ProfileField label="SOCSO no" value={employee.profile.socsoNumber ?? "—"} />
            <ProfileField label="Tax no" value={employee.profile.taxNumber ?? "—"} />
          </div>
        </ProfileSection>

        <ProfileSection title="Leave access">
          {employee.allowedLeaveTypeNames.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {employee.allowedLeaveTypeNames.map((name) => (
                <Badge key={name} variant="secondary">
                  {name}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No leave types assigned.</p>
          )}
        </ProfileSection>

        <ProfileSection className="lg:col-span-2" title="Family">
          <div className="grid gap-4 lg:grid-cols-2">
            <SubPanel title="Spouse">
              {spouse ? (
                <div className="space-y-2">
                  <ProfileField label="Name" value={spouse.fullName} />
                  <ProfileField label="IC no" value={spouse.icNumber ?? "—"} />
                  <ProfileField
                    label="Working"
                    value={spouse.isWorking === null ? "—" : spouse.isWorking ? "Yes" : "No"}
                  />
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No spouse on file.</p>
              )}
            </SubPanel>

            <SubPanel title={`Children (${children.length})`}>
              {children.length > 0 ? (
                <div className="space-y-2">
                  {children.map((child) => (
                    <div className="rounded-md border bg-card px-3 py-2" key={child.id}>
                      <p className="text-sm font-medium text-foreground">{child.fullName}</p>
                      <p className="text-xs text-muted-foreground">
                        {[child.icNumber, formatProfileDate(child.dateOfBirth)]
                          .filter((value) => value && value !== "—")
                          .join(" · ") || "No details"}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No children on file.</p>
              )}
            </SubPanel>
          </div>
        </ProfileSection>

        <ProfileSection className="lg:col-span-2" title="Emergency contacts">
          {employee.emergencyContacts.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {employee.emergencyContacts.map((contact) => (
                <div className="rounded-lg border bg-muted/30 px-3 py-2.5" key={contact.id}>
                  <p className="text-sm font-semibold text-foreground">{contact.name}</p>
                  <p className="text-xs text-muted-foreground">{contact.relationship ?? "Contact"}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{contact.phone}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No emergency contacts on file.</p>
          )}
        </ProfileSection>
      </div>
    </div>
  );
}
