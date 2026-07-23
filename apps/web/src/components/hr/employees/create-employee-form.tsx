"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

import {
  HrCheckbox,
  HrField,
  HrFormMessage,
  HrGhostButton,
  HrPrimaryButton,
  HrSelect,
  HrTextInput,
  HrTextarea,
} from "@/components/hr/employees/form-fields";
import { createEmployee, type EmployeeActionState } from "@/app/(hr)/hr/employees/actions";

const initialState: EmployeeActionState = {};

const tabs = [
  { id: "employment", label: "1. Employment" },
  { id: "personal", label: "2. Personal & bank" },
  { id: "family", label: "3. Family" },
  { id: "emergency", label: "4. Emergency" },
] as const;

type TabId = (typeof tabs)[number]["id"];
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
  const [tab, setTab] = useState<TabId>("employment");
  const [childCount, setChildCount] = useState(0);
  const [emergencyCount, setEmergencyCount] = useState(1);

  return (
    <form action={formAction} className="overflow-hidden rounded-2xl border border-[var(--border-primary)] bg-[var(--surface-card)] shadow-[var(--shadow-card)]">
      <div className="flex items-center justify-between bg-[var(--accent-primary)] px-5 py-4">
        <div>
          <h2 className="text-base font-semibold text-white">Create employee</h2>
          <p className="text-xs text-white/80">Complete each tab, then save the full profile.</p>
        </div>
        <Link className="text-white/90 hover:text-white" href="/hr/employees" aria-label="Close">
          ✕
        </Link>
      </div>

      <div className="flex flex-wrap gap-1 border-b border-[var(--border-primary)] bg-[var(--surface-muted)] p-2">
        {tabs.map((item) => (
          <button
            className={`rounded-[8px] px-3 py-2 text-xs font-semibold uppercase tracking-wide ${
              tab === item.id
                ? "bg-[var(--accent-primary)] text-white"
                : "text-[var(--foreground-secondary)] hover:bg-[var(--surface-card)]"
            }`}
            key={item.id}
            onClick={() => setTab(item.id)}
            type="button"
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="space-y-5 p-5">
        <div className={tab === "employment" ? "space-y-5" : "hidden"}>
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
            <p className="text-[13px] font-medium text-[var(--foreground-primary)]">Allowed leave types</p>
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
                <p className="text-sm text-[var(--foreground-muted)]">No leave types configured yet.</p>
              ) : null}
            </div>
          </div>

          <HrCheckbox
            defaultChecked
            id="sendActivationEmail"
            label="Send activation email so the employee can set a password and sign in"
            name="sendActivationEmail"
          />
        </div>

        <div className={tab === "personal" ? "space-y-5" : "hidden"}>
          <div className="grid gap-4 md:grid-cols-2">
            <HrField id="confirmationStatus" label="Status">
              <HrSelect defaultValue="confirmed" id="confirmationStatus" name="confirmationStatus">
                <option value="probation">Probation</option>
                <option value="confirmed">Confirmed</option>
                <option value="contract">Contract</option>
              </HrSelect>
            </HrField>
            <HrField id="fullName" label="Full name">
              <HrTextInput id="fullName" name="fullName" required />
            </HrField>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <HrField id="email" label="Email">
              <HrTextInput autoComplete="email" id="email" name="email" required type="email" />
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
              <HrTextInput id="race" name="race" />
            </HrField>
            <HrField id="religion" label="Religion">
              <HrTextInput id="religion" name="religion" />
            </HrField>
            <HrField id="phone" label="Mobile no">
              <HrTextInput id="phone" name="phone" />
            </HrField>
          </div>

          <HrField id="residentialAddress" label="Residential address">
            <HrTextarea id="residentialAddress" name="residentialAddress" />
          </HrField>

          <div className="border-t border-[var(--border-primary)] pt-4">
            <p className="mb-4 text-sm font-semibold text-[var(--accent-primary)]">Payroll & statutory</p>
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
            <div className="mt-4 grid gap-4 md:grid-cols-2">
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
          </div>
        </div>

        <div className={tab === "family" ? "space-y-5" : "hidden"}>
          <div className="rounded-[12px] border border-[var(--border-primary)] p-4">
            <p className="mb-4 text-sm font-semibold uppercase tracking-wide text-[var(--foreground-muted)]">
              Spouse information
            </p>
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
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold uppercase tracking-wide text-[var(--foreground-muted)]">
                Children details
              </p>
              <button
                className="text-sm font-medium text-[var(--accent-primary)] hover:text-[var(--accent-hover)]"
                onClick={() => setChildCount((count) => Math.min(count + 1, 5))}
                type="button"
              >
                + Add child
              </button>
            </div>
            {Array.from({ length: childCount }).map((_, index) => (
              <div className="grid gap-4 rounded-[12px] border border-[var(--border-primary)] p-4 md:grid-cols-3" key={`child_${index}`}>
                <HrField id={`childName_${index}`} label="Name">
                  <HrTextInput id={`childName_${index}`} name={`childName_${index}`} />
                </HrField>
                <HrField id={`childIc_${index}`} label="IC no">
                  <HrTextInput id={`childIc_${index}`} name={`childIc_${index}`} />
                </HrField>
                <HrField id={`childDob_${index}`} label="DOB">
                  <HrTextInput id={`childDob_${index}`} name={`childDob_${index}`} type="date" />
                </HrField>
              </div>
            ))}
            {childCount === 0 ? (
              <p className="text-sm text-[var(--foreground-muted)]">No children added yet.</p>
            ) : null}
          </div>
        </div>

        <div className={tab === "emergency" ? "space-y-5" : "hidden"}>
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold uppercase tracking-wide text-[var(--foreground-muted)]">
              Emergency contacts
            </p>
            <button
              className="text-sm font-medium text-[var(--accent-primary)] hover:text-[var(--accent-hover)]"
              onClick={() => setEmergencyCount((count) => Math.min(count + 1, 5))}
              type="button"
            >
              + Add contact
            </button>
          </div>
          {Array.from({ length: emergencyCount }).map((_, index) => (
            <div className="grid gap-4 rounded-[12px] border border-[var(--border-primary)] p-4 md:grid-cols-[1fr_1fr_1fr_auto]" key={`emergency_${index}`}>
              <HrField id={`emergencyName_${index}`} label="Name">
                <HrTextInput id={`emergencyName_${index}`} name={`emergencyName_${index}`} />
              </HrField>
              <HrField id={`emergencyRelationship_${index}`} label="Relationship">
                <HrTextInput id={`emergencyRelationship_${index}`} name={`emergencyRelationship_${index}`} />
              </HrField>
              <HrField id={`emergencyPhone_${index}`} label="Phone">
                <HrTextInput id={`emergencyPhone_${index}`} name={`emergencyPhone_${index}`} />
              </HrField>
              <div className="flex items-end pb-1">
                <button
                  className="inline-flex h-10 w-10 items-center justify-center rounded-[8px] text-[var(--danger)] hover:bg-[var(--danger-soft)]"
                  onClick={() => setEmergencyCount((count) => Math.max(1, count - 1))}
                  type="button"
                  aria-label="Remove contact"
                >
                  ⌫
                </button>
              </div>
            </div>
          ))}
        </div>

        <HrFormMessage error={state.error} success={state.success} />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border-primary)] bg-[var(--surface-muted)] px-5 py-4">
        <div className="flex gap-2">
          {tab !== "employment" ? (
            <HrGhostButton
              onClick={() =>
                setTab(tabs[Math.max(0, tabs.findIndex((item) => item.id === tab) - 1)]?.id ?? "employment")
              }
              type="button"
            >
              Previous
            </HrGhostButton>
          ) : null}
          {tab !== "emergency" ? (
            <HrGhostButton
              onClick={() =>
                setTab(tabs[Math.min(tabs.length - 1, tabs.findIndex((item) => item.id === tab) + 1)]?.id ?? "emergency")
              }
              type="button"
            >
              Next
            </HrGhostButton>
          ) : null}
        </div>
        <div className="flex gap-2">
          <Link href="/hr/employees">
            <HrGhostButton type="button">Cancel</HrGhostButton>
          </Link>
          <HrPrimaryButton disabled={pending} type="submit">
            {pending ? "Saving…" : "Save full profile"}
          </HrPrimaryButton>
        </div>
      </div>
    </form>
  );
}
