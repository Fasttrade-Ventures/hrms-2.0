"use client";

import Link from "next/link";
import { useActionState, useState, useTransition } from "react";

import { StatusPill } from "@hrms/ui";

import {
  addEmergencyContact,
  deactivateEmployee,
  resendActivation,
  updateEmployeeAddress,
  updateEmployeeBank,
  updateEmployeeCore,
  updateEmployeePersonal,
  type EmployeeActionState,
} from "@/app/(hr)/hr/employees/actions";
import {
  HrField,
  HrFormMessage,
  HrGhostButton,
  HrPrimaryButton,
  HrSelect,
  HrTextInput,
} from "@/components/hr/employees/form-fields";
import { PortalPageHeader } from "@/components/portal/portal-primitives";
import type { EmployeeDetail } from "@/lib/employees/queries";

const tabs = [
  { id: "personal", label: "Personal" },
  { id: "address", label: "Address" },
  { id: "emergency", label: "Emergency" },
  { id: "employment", label: "Employment" },
  { id: "bank", label: "Bank" },
  { id: "security", label: "Security" },
] as const;

type TabId = (typeof tabs)[number]["id"];

const initialState: EmployeeActionState = {};

function TabNav({ employeeId, activeTab }: { employeeId: string; activeTab: TabId }) {
  return (
    <div className="flex flex-wrap gap-2 border-b border-[var(--border-primary)]">
      {tabs.map((tab) => (
        <Link
          className={`px-4 py-3 text-sm font-medium ${
            activeTab === tab.id
              ? "border-b-2 border-[var(--accent-primary)] text-[var(--accent-primary)]"
              : "text-[var(--foreground-secondary)] hover:text-[var(--foreground-primary)]"
          }`}
          href={`/hr/employees/${employeeId}?tab=${tab.id}`}
          key={tab.id}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}

function PersonalTab({ employee }: { employee: EmployeeDetail }) {
  const action = updateEmployeePersonal.bind(null, employee.id);
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="space-y-5">
      <div className="grid gap-5 md:grid-cols-2">
        <HrField id="phone" label="Phone">
          <HrTextInput defaultValue={employee.profile.phone ?? ""} id="phone" name="phone" />
        </HrField>
        <HrField id="icNumber" label="IC / ID number">
          <HrTextInput defaultValue={employee.profile.icNumber ?? ""} id="icNumber" name="icNumber" />
        </HrField>
      </div>
      <HrFormMessage error={state.error} success={state.success} />
      <HrPrimaryButton disabled={pending} type="submit">
        Save personal details
      </HrPrimaryButton>
    </form>
  );
}

function AddressTab({ employee }: { employee: EmployeeDetail }) {
  const action = updateEmployeeAddress.bind(null, employee.id);
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="space-y-5">
      <div className="grid gap-5 md:grid-cols-2">
        <HrField id="addressLine1" label="Address line 1">
          <HrTextInput defaultValue={employee.profile.addressLine1 ?? ""} id="addressLine1" name="addressLine1" />
        </HrField>
        <HrField id="addressLine2" label="Address line 2">
          <HrTextInput defaultValue={employee.profile.addressLine2 ?? ""} id="addressLine2" name="addressLine2" />
        </HrField>
        <HrField id="city" label="City">
          <HrTextInput defaultValue={employee.profile.city ?? ""} id="city" name="city" />
        </HrField>
        <HrField id="state" label="State">
          <HrTextInput defaultValue={employee.profile.state ?? ""} id="state" name="state" />
        </HrField>
        <HrField id="postcode" label="Postcode">
          <HrTextInput defaultValue={employee.profile.postcode ?? ""} id="postcode" name="postcode" />
        </HrField>
        <HrField id="country" label="Country">
          <HrTextInput defaultValue={employee.profile.country ?? "MY"} id="country" name="country" />
        </HrField>
      </div>
      <HrFormMessage error={state.error} success={state.success} />
      <HrPrimaryButton disabled={pending} type="submit">
        Save address
      </HrPrimaryButton>
    </form>
  );
}

function EmergencyTab({ employee }: { employee: EmployeeDetail }) {
  const action = addEmergencyContact.bind(null, employee.id);
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <div className="space-y-6">
      {employee.emergencyContacts.length > 0 ? (
        <div className="space-y-3">
          {employee.emergencyContacts.map((contact) => (
            <div
              className="border border-[var(--border-primary)] bg-[var(--surface-card)] p-4"
              key={contact.id}
            >
              <p className="font-medium text-[var(--foreground-primary)]">{contact.name}</p>
              <p className="text-sm text-[var(--foreground-secondary)]">
                {contact.relationship ?? "Contact"} · {contact.phone}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-[var(--foreground-secondary)]">No emergency contacts yet.</p>
      )}

      <form action={formAction} className="space-y-5 border border-[var(--border-primary)] bg-[var(--surface-card)] p-5">
        <h3 className="text-sm font-semibold text-[var(--foreground-primary)]">Add emergency contact</h3>
        <div className="grid gap-5 md:grid-cols-2">
          <HrField id="name" label="Name">
            <HrTextInput id="name" name="name" required />
          </HrField>
          <HrField id="relationship" label="Relationship">
            <HrTextInput id="relationship" name="relationship" />
          </HrField>
          <HrField id="phone" label="Phone">
            <HrTextInput id="phone" name="phone" required />
          </HrField>
        </div>
        <HrFormMessage error={state.error} success={state.success} />
        <HrPrimaryButton disabled={pending} type="submit">
          Add contact
        </HrPrimaryButton>
      </form>
    </div>
  );
}

function EmploymentTab({
  employee,
  branches,
  departments,
  managers,
}: {
  employee: EmployeeDetail;
  branches: Array<{ id: string; name: string }>;
  departments: Array<{ id: string; name: string }>;
  managers: Array<{ id: string; full_name: string; employee_number: string }>;
}) {
  const action = updateEmployeeCore.bind(null, employee.id);
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="space-y-5">
      <div className="grid gap-5 md:grid-cols-2">
        <HrField id="fullName" label="Full name">
          <HrTextInput defaultValue={employee.fullName} id="fullName" name="fullName" required />
        </HrField>
        <HrField id="email" label="Work email">
          <HrTextInput defaultValue={employee.email} id="email" name="email" required type="email" />
        </HrField>
        <HrField id="joinDate" label="Join date">
          <HrTextInput defaultValue={employee.joinDate} id="joinDate" name="joinDate" required type="date" />
        </HrField>
        <HrField id="status" label="Status">
          <HrSelect defaultValue={employee.status} id="status" name="status">
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="terminated">Terminated</option>
          </HrSelect>
        </HrField>
        <HrField id="branchId" label="Branch">
          <HrSelect defaultValue={employee.branchId ?? ""} id="branchId" name="branchId">
            <option value="">No branch</option>
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </HrSelect>
        </HrField>
        <HrField id="departmentId" label="Department">
          <HrSelect defaultValue={employee.departmentId ?? ""} id="departmentId" name="departmentId">
            <option value="">No department</option>
            {departments.map((department) => (
              <option key={department.id} value={department.id}>
                {department.name}
              </option>
            ))}
          </HrSelect>
        </HrField>
        <HrField id="managerEmployeeId" label="Manager">
          <HrSelect defaultValue={employee.managerEmployeeId ?? ""} id="managerEmployeeId" name="managerEmployeeId">
            <option value="">No manager</option>
            {managers
              .filter((manager) => manager.id !== employee.id)
              .map((manager) => (
                <option key={manager.id} value={manager.id}>
                  {manager.full_name} ({manager.employee_number})
                </option>
              ))}
          </HrSelect>
        </HrField>
      </div>
      <HrFormMessage error={state.error} success={state.success} />
      <HrPrimaryButton disabled={pending} type="submit">
        Save employment details
      </HrPrimaryButton>
    </form>
  );
}

function BankTab({ employee }: { employee: EmployeeDetail }) {
  const action = updateEmployeeBank.bind(null, employee.id);
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="space-y-5">
      <div className="grid gap-5 md:grid-cols-2">
        <HrField id="bankName" label="Bank name">
          <HrTextInput defaultValue={employee.profile.bankName ?? ""} id="bankName" name="bankName" />
        </HrField>
        <HrField id="bankAccountNumber" label="Account number">
          <HrTextInput
            defaultValue={employee.profile.bankAccountNumber ?? ""}
            id="bankAccountNumber"
            name="bankAccountNumber"
          />
        </HrField>
        <HrField id="epfNumber" label="EPF number">
          <HrTextInput defaultValue={employee.profile.epfNumber ?? ""} id="epfNumber" name="epfNumber" />
        </HrField>
        <HrField id="socsoNumber" label="SOCSO number">
          <HrTextInput defaultValue={employee.profile.socsoNumber ?? ""} id="socsoNumber" name="socsoNumber" />
        </HrField>
        <HrField id="taxNumber" label="Tax number">
          <HrTextInput defaultValue={employee.profile.taxNumber ?? ""} id="taxNumber" name="taxNumber" />
        </HrField>
        <HrField id="basicSalary" label="Basic salary (MYR)">
          <HrTextInput
            defaultValue={employee.profile.basicSalary.toFixed(2)}
            id="basicSalary"
            name="basicSalary"
          />
        </HrField>
      </div>
      <HrFormMessage error={state.error} success={state.success} />
      <HrPrimaryButton disabled={pending} type="submit">
        Save bank details
      </HrPrimaryButton>
    </form>
  );
}

function SecurityTab({ employee }: { employee: EmployeeDetail }) {
  const deactivateAction = deactivateEmployee.bind(null, employee.id);
  const [deactivateState, deactivateFormAction, deactivatePending] = useActionState(
    deactivateAction,
    initialState,
  );
  const [resendState, setResendState] = useState<EmployeeActionState>({});
  const [isPending, startTransition] = useTransition();

  return (
    <div className="space-y-6">
      <div className="border border-[var(--border-primary)] bg-[var(--surface-card)] p-5">
        <h3 className="text-sm font-semibold text-[var(--foreground-primary)]">Login access</h3>
        <p className="mt-2 text-sm text-[var(--foreground-secondary)]">
          {employee.membership
            ? `Linked to auth user with roles: ${employee.membership.roles.join(", ") || "employee"}`
            : "No login account linked yet."}
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <HrPrimaryButton
            disabled={isPending}
            onClick={() =>
              startTransition(async () => {
                const result = await resendActivation(employee.id);
                setResendState(result);
              })
            }
            type="button"
          >
            {isPending ? "Sending…" : "Resend activation email"}
          </HrPrimaryButton>
        </div>
        <HrFormMessage error={resendState.error} success={resendState.success} />
      </div>

      <form action={deactivateFormAction} className="space-y-4 border border-[var(--border-primary)] bg-[var(--surface-card)] p-5">
        <h3 className="text-sm font-semibold text-[var(--foreground-primary)]">Deactivate employee</h3>
        <p className="text-sm text-[var(--foreground-secondary)]">
          Mark the employee as inactive or terminated. This does not delete their records.
        </p>
        <HrField id="deactivateStatus" label="Status">
          <HrSelect defaultValue="inactive" id="deactivateStatus" name="status">
            <option value="inactive">Inactive</option>
            <option value="terminated">Terminated</option>
          </HrSelect>
        </HrField>
        <HrFormMessage error={deactivateState.error} success={deactivateState.success} />
        <HrGhostButton disabled={deactivatePending} type="submit">
          Update status
        </HrGhostButton>
      </form>
    </div>
  );
}

export function EmployeeDetailView({
  employee,
  activeTab,
  branches,
  departments,
  managers,
  banner,
}: {
  employee: EmployeeDetail;
  activeTab: TabId;
  branches: Array<{ id: string; name: string }>;
  departments: Array<{ id: string; name: string }>;
  managers: Array<{ id: string; full_name: string; employee_number: string }>;
  banner?: string;
}) {
  return (
    <div className="space-y-6">
      <PortalPageHeader
        actions={
          <Link
            className="inline-flex h-11 items-center border border-[var(--border-primary)] bg-[var(--surface-card)] px-5 text-sm font-medium hover:bg-[var(--surface-muted)]"
            href="/hr/employees"
          >
            Back to list
          </Link>
        }
        description={`${employee.employeeNumber} · ${employee.email}`}
        title={employee.fullName}
      />

      <div className="flex flex-wrap items-center gap-3">
        <StatusPill label={employee.status} tone={employee.status === "active" ? "success" : "warning"} />
        {employee.branchName ? (
          <span className="text-sm text-[var(--foreground-secondary)]">{employee.branchName}</span>
        ) : null}
        {employee.departmentName ? (
          <span className="text-sm text-[var(--foreground-secondary)]">{employee.departmentName}</span>
        ) : null}
      </div>

      {banner ? (
        <div className="border border-[var(--accent-primary)] bg-[var(--surface-accent-soft)] px-4 py-3 text-sm text-[var(--accent-primary)]">
          {banner}
        </div>
      ) : null}

      <TabNav activeTab={activeTab} employeeId={employee.id} />

      <div className="border border-[var(--border-primary)] bg-[var(--surface-card)] p-6">
        {activeTab === "personal" ? <PersonalTab employee={employee} /> : null}
        {activeTab === "address" ? <AddressTab employee={employee} /> : null}
        {activeTab === "emergency" ? <EmergencyTab employee={employee} /> : null}
        {activeTab === "employment" ? (
          <EmploymentTab
            branches={branches}
            departments={departments}
            employee={employee}
            managers={managers}
          />
        ) : null}
        {activeTab === "bank" ? <BankTab employee={employee} /> : null}
        {activeTab === "security" ? <SecurityTab employee={employee} /> : null}
      </div>
    </div>
  );
}

export function isEmployeeTab(value: string | undefined): value is TabId {
  return tabs.some((tab) => tab.id === value);
}

export const employeeTabs = tabs;
