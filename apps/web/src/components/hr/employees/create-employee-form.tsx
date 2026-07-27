"use client";

import { useActionState, useState } from "react";

import { createEmployee, type EmployeeActionState } from "@/app/(hr)/hr/employees/actions";
import {
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
  HrSelect,
  HrTextInput,
} from "@/components/hr/employees/form-fields";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  MALAYSIAN_RACE_OPTIONS,
  MALAYSIAN_RELIGION_OPTIONS,
  MALAYSIAN_STATE_OPTIONS,
} from "@/lib/employees/malaysia-demographics";

const initialState: EmployeeActionState = {};
type Option = { id: string; name: string; branch_id?: string | null };

export function CreateEmployeeForm({
  suggestedEmployeeNumber,
  joinDate,
  branches,
  departments,
  managers,
  shifts,
  payGroups,
  leaveTypes,
}: {
  suggestedEmployeeNumber: string;
  joinDate: string;
  branches: Option[];
  departments: Option[];
  managers: Array<{ id: string; full_name: string; employee_number: string }>;
  shifts: Option[];
  payGroups: Option[];
  leaveTypes: Option[];
}) {
  const [state, formAction, pending] = useActionState(createEmployee, initialState);
  const [tab, setTab] = useState<EmployeeFormTabId>("employment");
  const [childCount, setChildCount] = useState(0);
  const [emergencyCount, setEmergencyCount] = useState(1);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");

  return (
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
            <HrField hint="Leave blank to auto-generate" id="employeeNumber" label="Staff ID">
              <HrTextInput defaultValue={suggestedEmployeeNumber} id="employeeNumber" name="employeeNumber" />
            </HrField>
            <HrField id="joinDate" label="Join date">
              <HrTextInput defaultValue={joinDate} id="joinDate" name="joinDate" required type="date" />
            </HrField>
            <HrField id="employmentType" label="Emp. type">
              <HrSelect defaultValue="full_time" id="employmentType" name="employmentType">
                <option value="full_time">Full-time</option>
                <option value="part_time">Part-time</option>
                <option value="contract">Contract</option>
                <option value="intern">Intern</option>
              </HrSelect>
            </HrField>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <HrField id="jobTitle" label="Position / job title">
              <HrTextInput id="jobTitle" name="jobTitle" />
            </HrField>
            <HrField id="portalRole" label="Portal role">
              <HrSelect defaultValue="employee" id="portalRole" name="portalRole">
                <option value="employee">Employee</option>
                <option value="manager">Manager</option>
                <option value="hr_administrator">HR Administrator</option>
              </HrSelect>
            </HrField>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <HrField id="branchId" label="Branch">
              <HrSelect defaultValue="" id="branchId" name="branchId">
                <option value="">-- Select --</option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </HrSelect>
            </HrField>
            <HrField id="departmentId" label="Department">
              <HrSelect defaultValue="" id="departmentId" name="departmentId">
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
              <HrSelect defaultValue="" id="payGroupId" name="payGroupId">
                <option value="">Default</option>
                {payGroups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </HrSelect>
            </HrField>
            <HrField id="managerEmployeeId" label="Approving manager (PIC)">
              <HrSelect defaultValue="" id="managerEmployeeId" name="managerEmployeeId">
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
              <HrTextInput defaultValue="14" id="annualLeaveEntitlement" name="annualLeaveEntitlement" step="0.5" type="number" />
            </HrField>
            <HrField id="annualLeaveCarryForward" label="Carry forward">
              <HrTextInput defaultValue="0" id="annualLeaveCarryForward" name="annualLeaveCarryForward" step="0.5" type="number" />
            </HrField>
          </div>

          <HrField id="shiftId" label="Assign attendance shift">
            <HrSelect defaultValue="" id="shiftId" name="shiftId">
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
                  defaultChecked
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

          <HrCheckbox
            defaultChecked
            id="sendActivationEmail"
            label="Send activation email so the employee can set a password and sign in"
            name="sendActivationEmail"
          />
      </EmployeeFormTabPanel>

      <EmployeeFormTabPanel activeTab={tab} tab="personal">
          <EmployeeProfilePhotoField email={email} name={fullName} />

          <div className="grid gap-4 md:grid-cols-2">
            <HrField id="confirmationStatus" label="Status">
              <HrSelect defaultValue="confirmed" id="confirmationStatus" name="confirmationStatus">
                <option value="probation">Probation</option>
                <option value="confirmed">Confirmed</option>
                <option value="contract">Contract</option>
              </HrSelect>
            </HrField>
            <HrField id="fullName" label="Full name">
              <HrTextInput
                id="fullName"
                name="fullName"
                onChange={(event) => setFullName(event.target.value)}
                required
              />
            </HrField>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <HrField id="email" label="Email">
              <HrTextInput
                autoComplete="email"
                id="email"
                name="email"
                onChange={(event) => setEmail(event.target.value)}
                required
                type="email"
              />
            </HrField>
            <HrField id="icNumber" label="NRIC no">
              <HrTextInput id="icNumber" name="icNumber" />
            </HrField>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <HrField id="dateOfBirth" label="DOB">
              <HrTextInput id="dateOfBirth" name="dateOfBirth" type="date" />
            </HrField>
            <HrField id="gender" label="Gender">
              <HrSelect defaultValue="" id="gender" name="gender">
                <option value="">-- Select --</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
                <option value="prefer_not_to_say">Prefer not to say</option>
              </HrSelect>
            </HrField>
            <HrField id="maritalStatus" label="Marital status">
              <HrSelect defaultValue="" id="maritalStatus" name="maritalStatus">
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
              <HrSelect defaultValue="" id="race" name="race">
                <option value="">-- Select --</option>
                {MALAYSIAN_RACE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </HrSelect>
            </HrField>
            <HrField id="religion" label="Religion">
              <HrSelect defaultValue="" id="religion" name="religion">
                <option value="">-- Select --</option>
                {MALAYSIAN_RELIGION_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </HrSelect>
            </HrField>
            <HrField id="phone" label="Mobile no">
              <HrTextInput id="phone" name="phone" />
            </HrField>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <HrField id="addressLine1" label="Address line 1">
              <HrTextInput id="addressLine1" name="addressLine1" />
            </HrField>
            <HrField id="addressLine2" label="Address line 2">
              <HrTextInput id="addressLine2" name="addressLine2" />
            </HrField>
            <HrField id="city" label="City">
              <HrTextInput id="city" name="city" />
            </HrField>
            <HrField id="state" label="State">
              <HrSelect defaultValue="" id="state" name="state">
                <option value="">-- Select --</option>
                {MALAYSIAN_STATE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </HrSelect>
            </HrField>
            <HrField id="postcode" label="Postcode">
              <HrTextInput id="postcode" name="postcode" />
            </HrField>
            <HrField id="country" label="Country">
              <HrSelect defaultValue="MY" id="country" name="country">
                <option value="MY">Malaysia</option>
              </HrSelect>
            </HrField>
          </div>

        <EmployeeFormPayrollSection>
          <div className="grid gap-4 md:grid-cols-3">
              <HrField id="payBasis" label="Pay basis">
                <HrSelect defaultValue="monthly" id="payBasis" name="payBasis">
                  <option value="monthly">Monthly</option>
                  <option value="daily">Daily</option>
                  <option value="hourly">Hourly</option>
                </HrSelect>
              </HrField>
              <HrField id="workingDaysPerMonth" label="Working days/mo">
                <HrTextInput defaultValue="21" id="workingDaysPerMonth" name="workingDaysPerMonth" type="number" />
              </HrField>
              <HrField id="basicSalary" label="Basic salary (RM)">
                <HrTextInput id="basicSalary" name="basicSalary" placeholder="0.00" />
              </HrField>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <HrField id="bankName" label="Bank name">
                <HrTextInput id="bankName" name="bankName" />
              </HrField>
              <HrField id="bankAccountNumber" label="Bank account no">
                <HrTextInput id="bankAccountNumber" name="bankAccountNumber" />
              </HrField>
              <HrField id="epfNumber" label="EPF no">
                <HrTextInput id="epfNumber" name="epfNumber" />
              </HrField>
              <HrField id="socsoNumber" label="SOCSO no">
                <HrTextInput id="socsoNumber" name="socsoNumber" />
              </HrField>
              <HrField id="taxNumber" label="Tax no">
                <HrTextInput id="taxNumber" name="taxNumber" />
              </HrField>
            </div>
            <p className="text-sm text-muted-foreground">
              EPF rates apply on the next payrun. Extra EPF is added on top of the statutory employee
              rate.
            </p>
            <div className="grid gap-4 md:grid-cols-3">
              <HrField id="epfEmployeeRate" label="EPF employee rate (%)">
                <HrTextInput
                  defaultValue="11"
                  id="epfEmployeeRate"
                  max={100}
                  min={0}
                  name="epfEmployeeRate"
                  step="0.01"
                  type="number"
                />
              </HrField>
              <HrField id="epfEmployerRate" label="EPF employer rate (%)">
                <HrTextInput
                  defaultValue="13"
                  id="epfEmployerRate"
                  max={100}
                  min={0}
                  name="epfEmployerRate"
                  step="0.01"
                  type="number"
                />
              </HrField>
              <HrField id="voluntaryEpfExtraRate" label="Extra EPF on top (%)">
                <HrTextInput
                  defaultValue="0"
                  id="voluntaryEpfExtraRate"
                  max={100}
                  min={0}
                  name="voluntaryEpfExtraRate"
                  step="0.01"
                  type="number"
                />
              </HrField>
            </div>
            <HrCheckbox defaultChecked id="eisEligible" label="Eligible for EIS" name="eisEligible" />
        </EmployeeFormPayrollSection>
      </EmployeeFormTabPanel>

      <EmployeeFormTabPanel activeTab={tab} tab="family">
        <EmployeeFormSubsection title="Spouse information">
          <div className="grid gap-4 md:grid-cols-3">
            <HrField id="spouseName" label="Name">
              <HrTextInput id="spouseName" name="spouseName" />
            </HrField>
            <HrField id="spouseIc" label="IC no">
              <HrTextInput id="spouseIc" name="spouseIc" />
            </HrField>
            <HrField id="spouseWorking" label="Working?">
              <HrSelect defaultValue="no" id="spouseWorking" name="spouseWorking">
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
          {Array.from({ length: childCount }).map((_, index) => (
            <EmployeeFormRepeaterRow
              key={`child_${index}`}
              onRemove={() => setChildCount((count) => Math.max(0, count - 1))}
              removeLabel="Remove child"
            >
              <HrField id={`childName_${index}`} label="Name">
                <HrTextInput id={`childName_${index}`} name={`childName_${index}`} />
              </HrField>
              <HrField id={`childIc_${index}`} label="IC no">
                <HrTextInput id={`childIc_${index}`} name={`childIc_${index}`} />
              </HrField>
              <HrField id={`childDob_${index}`} label="DOB">
                <HrTextInput id={`childDob_${index}`} name={`childDob_${index}`} type="date" />
              </HrField>
            </EmployeeFormRepeaterRow>
          ))}
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
        {Array.from({ length: emergencyCount }).map((_, index) => (
          <EmployeeFormRepeaterRow
            key={`emergency_${index}`}
            onRemove={() => setEmergencyCount((count) => Math.max(1, count - 1))}
            removeLabel="Remove contact"
          >
            <HrField id={`emergencyName_${index}`} label="Name">
              <HrTextInput id={`emergencyName_${index}`} name={`emergencyName_${index}`} />
            </HrField>
            <HrField id={`emergencyRelationship_${index}`} label="Relationship">
              <HrTextInput
                id={`emergencyRelationship_${index}`}
                name={`emergencyRelationship_${index}`}
              />
            </HrField>
            <HrField id={`emergencyPhone_${index}`} label="Phone">
              <HrTextInput id={`emergencyPhone_${index}`} name={`emergencyPhone_${index}`} />
            </HrField>
          </EmployeeFormRepeaterRow>
        ))}
      </EmployeeFormTabPanel>

      <HrFormMessage error={state.error} success={state.success} />
    </EmployeeFormShell>
  );
}
