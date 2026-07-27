"use client";

import { useActionState, useMemo, useState, useTransition } from "react";

import {
  resendActivation,
  updateEmployeeFull,
  type EmployeeActionState,
} from "@/app/(hr)/hr/employees/actions";
import { DeleteEmployeeButton } from "@/components/hr/employees/delete-employee-button";
import {
  EmployeeFormBanner,
  EmployeeFormFooterNav,
  EmployeeFormPayrollSection,
  EmployeeFormRepeaterRow,
  EmployeeFormSectionHeader,
  EmployeeFormShell,
  EmployeeFormSubsection,
  EmployeeFormTabPanel,
  type EmployeeFormTabId,
} from "@/components/hr/employees/employee-form-shell";
import { EmployeeProfilePhotoField } from "@/components/hr/employees/employee-profile-photo-field";
import {
  HrCheckbox,
  HrField,
  HrFormMessage,
  HrGhostButton,
  HrSelect,
  HrTextInput,
} from "@/components/hr/employees/form-fields";
import { Label } from "@/components/ui/label";
import type { EmployeeDetail } from "@/lib/employees/queries";
import {
  MALAYSIAN_RACE_OPTIONS,
  MALAYSIAN_RELIGION_OPTIONS,
  MALAYSIAN_STATE_OPTIONS,
  withCurrentDemographicsOption,
} from "@/lib/employees/malaysia-demographics";
import { Button } from "@/components/ui/button";

const initialState: EmployeeActionState = {};
type Option = { id: string; name: string; branch_id?: string | null };

export function EditEmployeeForm({
  employee,
  branches,
  departments,
  managers,
  shifts,
  payGroups,
  leaveTypes,
  banner,
}: {
  employee: EmployeeDetail;
  branches: Option[];
  departments: Option[];
  managers: Array<{ id: string; full_name: string; employee_number: string }>;
  shifts: Option[];
  payGroups: Option[];
  leaveTypes: Option[];
  banner?: string;
}) {
  const boundAction = useMemo(() => updateEmployeeFull.bind(null, employee.id), [employee.id]);
  const [state, formAction, pending] = useActionState(boundAction, initialState);
  const [tab, setTab] = useState<EmployeeFormTabId>("employment");
  const [resendState, setResendState] = useState<EmployeeActionState>({});
  const [resendPending, startResend] = useTransition();

  const spouse = employee.dependents.find((item) => item.dependentType === "spouse");
  const children = employee.dependents.filter((item) => item.dependentType === "child");
  const [childCount, setChildCount] = useState(Math.max(children.length, 0));
  const [emergencyCount, setEmergencyCount] = useState(Math.max(employee.emergencyContacts.length, 1));

  const portalRole =
    employee.membership?.roles.find((role) =>
      ["employee", "manager", "hr_administrator"].includes(role),
    ) ?? "employee";

  const allowedLeaveSet = new Set(employee.allowedLeaveTypeIds);

  return (
    <div className="space-y-4">
      {banner ? <EmployeeFormBanner>{banner}</EmployeeFormBanner> : null}

      <EmployeeFormShell
        footer={
          <EmployeeFormFooterNav
            cancelHref="/hr/employees"
            onTabChange={setTab}
            pending={pending}
            tab={tab}
          />
        }
        formProps={{ action: formAction, encType: "multipart/form-data" }}
        onTabChange={setTab}
        tab={tab}
      >
        <EmployeeFormTabPanel activeTab={tab} tab="employment">
            <div className="grid gap-4 md:grid-cols-3">
              <HrField hint="Staff identifier" id="employeeNumber" label="Staff ID">
                <HrTextInput
                  defaultValue={employee.employeeNumber}
                  id="employeeNumber"
                  name="employeeNumber"
                />
              </HrField>
              <HrField id="joinDate" label="Join date">
                <HrTextInput
                  defaultValue={employee.joinDate}
                  id="joinDate"
                  name="joinDate"
                  required
                  type="date"
                />
              </HrField>
              <HrField id="employmentType" label="Emp. type">
                <HrSelect
                  defaultValue={employee.employmentType ?? "full_time"}
                  id="employmentType"
                  name="employmentType"
                >
                  <option value="full_time">Full-time</option>
                  <option value="part_time">Part-time</option>
                  <option value="contract">Contract</option>
                  <option value="intern">Intern</option>
                </HrSelect>
              </HrField>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <HrField id="jobTitle" label="Position / job title">
                <HrTextInput defaultValue={employee.jobTitle ?? ""} id="jobTitle" name="jobTitle" />
              </HrField>
              <HrField id="portalRole" label="Portal role">
                <HrSelect defaultValue={portalRole} id="portalRole" name="portalRole">
                  <option value="employee">Employee</option>
                  <option value="manager">Manager</option>
                  <option value="hr_administrator">HR Administrator</option>
                </HrSelect>
              </HrField>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <HrField id="branchId" label="Branch">
                <HrSelect defaultValue={employee.branchId ?? ""} id="branchId" name="branchId">
                  <option value="">-- Select --</option>
                  {branches.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name}
                    </option>
                  ))}
                </HrSelect>
              </HrField>
              <HrField id="departmentId" label="Department">
                <HrSelect
                  defaultValue={employee.departmentId ?? ""}
                  id="departmentId"
                  name="departmentId"
                >
                  <option value="">-- Select --</option>
                  {departments.map((department) => (
                    <option key={department.id} value={department.id}>
                      {department.name}
                    </option>
                  ))}
                </HrSelect>
              </HrField>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <HrField
                hint="Assign staff to a group for scoped payrun generation."
                id="payGroupId"
                label="Pay group"
              >
                <HrSelect defaultValue={employee.payGroupId ?? ""} id="payGroupId" name="payGroupId">
                  <option value="">Default</option>
                  {payGroups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name}
                    </option>
                  ))}
                </HrSelect>
              </HrField>
              <HrField id="managerEmployeeId" label="Approving manager (PIC)">
                <HrSelect
                  defaultValue={employee.managerEmployeeId ?? ""}
                  id="managerEmployeeId"
                  name="managerEmployeeId"
                >
                  <option value="">-- Direct reporting --</option>
                  {managers.map((manager) => (
                    <option key={manager.id} value={manager.id}>
                      {manager.full_name} ({manager.employee_number})
                    </option>
                  ))}
                </HrSelect>
              </HrField>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <HrField id="annualLeaveEntitlement" label="AL entitlement">
                <HrTextInput
                  defaultValue={String(employee.annualLeaveEntitlement)}
                  id="annualLeaveEntitlement"
                  name="annualLeaveEntitlement"
                  step="0.5"
                  type="number"
                />
              </HrField>
              <HrField id="annualLeaveCarryForward" label="Carry forward">
                <HrTextInput
                  defaultValue={String(employee.annualLeaveCarryForward)}
                  id="annualLeaveCarryForward"
                  name="annualLeaveCarryForward"
                  step="0.5"
                  type="number"
                />
              </HrField>
            </div>

            <HrField id="shiftId" label="Assign attendance shift">
              <HrSelect defaultValue={employee.shiftId ?? ""} id="shiftId" name="shiftId">
                <option value="">-- No shift assigned --</option>
                {shifts.map((shift) => (
                  <option key={shift.id} value={shift.id}>
                    {shift.name}
                  </option>
                ))}
              </HrSelect>
            </HrField>

            <div className="space-y-3">
              <Label className="text-sm font-medium">Allowed leave types</Label>
              <div className="grid gap-2 sm:grid-cols-2">
                {leaveTypes.map((leaveType) => (
                  <HrCheckbox
                    defaultChecked={
                      allowedLeaveSet.size === 0 ? true : allowedLeaveSet.has(leaveType.id)
                    }
                    id={`leave_${leaveType.id}`}
                    key={leaveType.id}
                    label={leaveType.name}
                    name="allowedLeaveTypeIds"
                    value={leaveType.id}
                  />
                ))}
                {leaveTypes.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No leave types configured yet.</p>
                ) : null}
              </div>
            </div>

            <EmployeeFormSubsection title="Login access">
              <p className="text-sm text-muted-foreground">
                {employee.membership
                  ? `Linked account · roles: ${employee.membership.roles.join(", ") || "employee"}`
                  : "No login account linked yet."}
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <HrGhostButton
                  disabled={resendPending}
                  onClick={() =>
                    startResend(async () => {
                      const result = await resendActivation(employee.id);
                      setResendState(result);
                    })
                  }
                  type="button"
                >
                  {resendPending ? "Sending…" : "Resend activation email"}
                </HrGhostButton>
                <DeleteEmployeeButton employeeId={employee.id} employeeName={employee.fullName} />
              </div>
              <HrFormMessage error={resendState.error} success={resendState.success} />
            </EmployeeFormSubsection>
        </EmployeeFormTabPanel>

        <EmployeeFormTabPanel activeTab={tab} tab="personal">
            <EmployeeProfilePhotoField
              email={employee.email}
              hasStoredPhoto={Boolean(employee.profile.profilePhotoPath)}
              name={employee.fullName}
              photoUrl={employee.profile.profilePhotoUrl}
            />
            <input
              name="profilePhotoPath"
              type="hidden"
              value={employee.profile.profilePhotoPath ?? ""}
            />

            <div className="grid gap-4 md:grid-cols-2">
              <HrField id="confirmationStatus" label="Status">
                <HrSelect
                  defaultValue={employee.confirmationStatus ?? "confirmed"}
                  id="confirmationStatus"
                  name="confirmationStatus"
                >
                  <option value="probation">Probation</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="contract">Contract</option>
                </HrSelect>
              </HrField>
              <HrField id="fullName" label="Full name">
                <HrTextInput
                  defaultValue={employee.fullName}
                  id="fullName"
                  name="fullName"
                  required
                />
              </HrField>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <HrField id="email" label="Email">
                <HrTextInput
                  autoComplete="email"
                  defaultValue={employee.email}
                  id="email"
                  name="email"
                  required
                  type="email"
                />
              </HrField>
              <HrField id="icNumber" label="NRIC no">
                <HrTextInput
                  defaultValue={employee.profile.icNumber ?? ""}
                  id="icNumber"
                  name="icNumber"
                />
              </HrField>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <HrField id="dateOfBirth" label="DOB">
                <HrTextInput
                  defaultValue={employee.profile.dateOfBirth ?? ""}
                  id="dateOfBirth"
                  name="dateOfBirth"
                  type="date"
                />
              </HrField>
              <HrField id="gender" label="Gender">
                <HrSelect defaultValue={employee.profile.gender ?? ""} id="gender" name="gender">
                  <option value="">-- Select --</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                  <option value="prefer_not_to_say">Prefer not to say</option>
                </HrSelect>
              </HrField>
              <HrField id="maritalStatus" label="Marital status">
                <HrSelect
                  defaultValue={employee.profile.maritalStatus ?? ""}
                  id="maritalStatus"
                  name="maritalStatus"
                >
                  <option value="">-- Select --</option>
                  <option value="single">Single</option>
                  <option value="married">Married</option>
                  <option value="divorced">Divorced</option>
                  <option value="widowed">Widowed</option>
                </HrSelect>
              </HrField>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <HrField id="race" label="Race">
                <HrSelect defaultValue={employee.profile.race ?? ""} id="race" name="race">
                  <option value="">-- Select --</option>
                  {withCurrentDemographicsOption(MALAYSIAN_RACE_OPTIONS, employee.profile.race).map(
                    (option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ),
                  )}
                </HrSelect>
              </HrField>
              <HrField id="religion" label="Religion">
                <HrSelect defaultValue={employee.profile.religion ?? ""} id="religion" name="religion">
                  <option value="">-- Select --</option>
                  {withCurrentDemographicsOption(
                    MALAYSIAN_RELIGION_OPTIONS,
                    employee.profile.religion,
                  ).map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </HrSelect>
              </HrField>
              <HrField id="phone" label="Mobile no">
                <HrTextInput defaultValue={employee.profile.phone ?? ""} id="phone" name="phone" />
              </HrField>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <HrField id="addressLine1" label="Address line 1">
                <HrTextInput
                  defaultValue={employee.profile.addressLine1 ?? ""}
                  id="addressLine1"
                  name="addressLine1"
                />
              </HrField>
              <HrField id="addressLine2" label="Address line 2">
                <HrTextInput
                  defaultValue={employee.profile.addressLine2 ?? ""}
                  id="addressLine2"
                  name="addressLine2"
                />
              </HrField>
              <HrField id="city" label="City">
                <HrTextInput defaultValue={employee.profile.city ?? ""} id="city" name="city" />
              </HrField>
              <HrField id="state" label="State">
                <HrSelect defaultValue={employee.profile.state ?? ""} id="state" name="state">
                  <option value="">-- Select --</option>
                  {withCurrentDemographicsOption(MALAYSIAN_STATE_OPTIONS, employee.profile.state).map(
                    (option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ),
                  )}
                </HrSelect>
              </HrField>
              <HrField id="postcode" label="Postcode">
                <HrTextInput
                  defaultValue={employee.profile.postcode ?? ""}
                  id="postcode"
                  name="postcode"
                />
              </HrField>
              <HrField id="country" label="Country">
                <HrSelect
                  defaultValue={employee.profile.country ?? "MY"}
                  id="country"
                  name="country"
                >
                  <option value="MY">Malaysia</option>
                  {employee.profile.country && employee.profile.country !== "MY" ? (
                    <option value={employee.profile.country}>{employee.profile.country}</option>
                  ) : null}
                </HrSelect>
              </HrField>
            </div>

            <EmployeeFormPayrollSection>
              <div className="grid gap-4 md:grid-cols-3">
                <HrField id="payBasis" label="Pay basis">
                  <HrSelect
                    defaultValue={employee.profile.payBasis ?? "monthly"}
                    id="payBasis"
                    name="payBasis"
                  >
                    <option value="monthly">Monthly</option>
                    <option value="daily">Daily</option>
                    <option value="hourly">Hourly</option>
                  </HrSelect>
                </HrField>
                <HrField id="workingDaysPerMonth" label="Working days/mo">
                  <HrTextInput
                    defaultValue={String(employee.profile.workingDaysPerMonth ?? 21)}
                    id="workingDaysPerMonth"
                    name="workingDaysPerMonth"
                    type="number"
                  />
                </HrField>
                <HrField id="basicSalary" label="Basic salary (RM)">
                  <HrTextInput
                    defaultValue={
                      employee.profile.basicSalary ? String(employee.profile.basicSalary) : ""
                    }
                    id="basicSalary"
                    name="basicSalary"
                    placeholder="0.00"
                  />
                </HrField>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <HrField id="bankName" label="Bank name">
                  <HrTextInput
                    defaultValue={employee.profile.bankName ?? ""}
                    id="bankName"
                    name="bankName"
                  />
                </HrField>
                <HrField id="bankAccountNumber" label="Bank account no">
                  <HrTextInput
                    defaultValue={employee.profile.bankAccountNumber ?? ""}
                    id="bankAccountNumber"
                    name="bankAccountNumber"
                  />
                </HrField>
                <HrField id="epfNumber" label="EPF no">
                  <HrTextInput
                    defaultValue={employee.profile.epfNumber ?? ""}
                    id="epfNumber"
                    name="epfNumber"
                  />
                </HrField>
                <HrField id="socsoNumber" label="SOCSO no">
                  <HrTextInput
                    defaultValue={employee.profile.socsoNumber ?? ""}
                    id="socsoNumber"
                    name="socsoNumber"
                  />
                </HrField>
                <HrField id="taxNumber" label="Tax no">
                  <HrTextInput
                    defaultValue={employee.profile.taxNumber ?? ""}
                    id="taxNumber"
                    name="taxNumber"
                  />
                </HrField>
              </div>
            </EmployeeFormPayrollSection>
        </EmployeeFormTabPanel>

        <EmployeeFormTabPanel activeTab={tab} tab="family">
          <EmployeeFormSubsection title="Spouse information">
            <div className="grid gap-4 md:grid-cols-3">
                <HrField id="spouseName" label="Name">
                  <HrTextInput
                    defaultValue={spouse?.fullName ?? ""}
                    id="spouseName"
                    name="spouseName"
                  />
                </HrField>
                <HrField id="spouseIc" label="IC no">
                  <HrTextInput
                    defaultValue={spouse?.icNumber ?? ""}
                    id="spouseIc"
                    name="spouseIc"
                  />
                </HrField>
                <HrField id="spouseWorking" label="Working?">
                  <HrSelect
                    defaultValue={spouse?.isWorking ? "yes" : "no"}
                    id="spouseWorking"
                    name="spouseWorking"
                  >
                    <option value="no">No</option>
                    <option value="yes">Yes</option>
                  </HrSelect>
                </HrField>
              </div>
          </EmployeeFormSubsection>

          <div className="space-y-3">
            <EmployeeFormSectionHeader
              action={
                <Button
                  onClick={() => setChildCount((count) => Math.min(count + 1, 5))}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  + Add child
                </Button>
              }
              title="Children details"
            />
            {Array.from({ length: childCount }).map((_, index) => {
              const child = children[index];
              return (
                <EmployeeFormRepeaterRow
                  key={`child_${index}`}
                  onRemove={() => setChildCount((count) => Math.max(0, count - 1))}
                  removeLabel="Remove child"
                >
                    <HrField id={`childName_${index}`} label="Name">
                      <HrTextInput
                        defaultValue={child?.fullName ?? ""}
                        id={`childName_${index}`}
                        name={`childName_${index}`}
                      />
                    </HrField>
                    <HrField id={`childIc_${index}`} label="IC no">
                      <HrTextInput
                        defaultValue={child?.icNumber ?? ""}
                        id={`childIc_${index}`}
                        name={`childIc_${index}`}
                      />
                    </HrField>
                    <HrField id={`childDob_${index}`} label="DOB">
                      <HrTextInput
                        defaultValue={child?.dateOfBirth ?? ""}
                        id={`childDob_${index}`}
                        name={`childDob_${index}`}
                        type="date"
                      />
                    </HrField>
                </EmployeeFormRepeaterRow>
              );
            })}
            {childCount === 0 ? (
              <p className="text-sm text-muted-foreground">No children added yet.</p>
            ) : null}
          </div>
        </EmployeeFormTabPanel>

        <EmployeeFormTabPanel activeTab={tab} tab="emergency">
          <EmployeeFormSectionHeader
            action={
              <Button
                onClick={() => setEmergencyCount((count) => Math.min(count + 1, 5))}
                size="sm"
                type="button"
                variant="outline"
              >
                + Add contact
              </Button>
            }
            title="Emergency contacts"
          />
          {Array.from({ length: emergencyCount }).map((_, index) => {
            const contact = employee.emergencyContacts[index];
            return (
              <EmployeeFormRepeaterRow
                key={`emergency_${index}`}
                onRemove={() => setEmergencyCount((count) => Math.max(1, count - 1))}
                removeLabel="Remove contact"
              >
                  <HrField id={`emergencyName_${index}`} label="Name">
                    <HrTextInput
                      defaultValue={contact?.name ?? ""}
                      id={`emergencyName_${index}`}
                      name={`emergencyName_${index}`}
                    />
                  </HrField>
                  <HrField id={`emergencyRelationship_${index}`} label="Relationship">
                    <HrTextInput
                      defaultValue={contact?.relationship ?? ""}
                      id={`emergencyRelationship_${index}`}
                      name={`emergencyRelationship_${index}`}
                    />
                  </HrField>
                  <HrField id={`emergencyPhone_${index}`} label="Phone">
                    <HrTextInput
                      defaultValue={contact?.phone ?? ""}
                      id={`emergencyPhone_${index}`}
                      name={`emergencyPhone_${index}`}
                    />
                  </HrField>
              </EmployeeFormRepeaterRow>
            );
          })}
        </EmployeeFormTabPanel>

        <HrFormMessage error={state.error} success={state.success} />
      </EmployeeFormShell>
    </div>
  );
}
