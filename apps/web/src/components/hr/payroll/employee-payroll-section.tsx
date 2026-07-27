"use client";

import { useState } from "react";

import { EmployeeCompensationPanel } from "@/components/hr/employees/employee-compensation-panel";
import { EmployeeTaxProfilePanel } from "@/components/hr/employees/employee-tax-profile-panel";
import { cn } from "@/lib/utils";
import type {
  AllowanceComponentOption,
  EmployeeCompensation,
  EmployeeTaxProfile,
  RecurringAllowance,
} from "@/lib/payroll/compensation";
import { PortalSectionCard } from "@/components/portal/portal-section";

type PayrollTab = "compensation" | "tax";

export function EmployeePayrollSection({
  employeeId,
  compensation,
  allowances,
  allowanceComponents,
  taxProfile,
}: {
  employeeId: string;
  compensation: EmployeeCompensation;
  allowances: RecurringAllowance[];
  allowanceComponents: AllowanceComponentOption[];
  taxProfile: EmployeeTaxProfile;
}) {
  const [tab, setTab] = useState<PayrollTab>("compensation");

  const tabs: Array<{ id: PayrollTab; label: string }> = [
    { id: "compensation", label: "Compensation" },
    { id: "tax", label: "Tax (TP1/TP3)" },
  ];

  return (
    <PortalSectionCard
      description="Set salary, EPF rates, allowances, and tax (TP1/TP3) for payrun calculations."
      title="Payroll configuration"
    >
      <div className="space-y-4">
      <div className="flex flex-wrap gap-2 border-b">
        {tabs.map((item) => (
          <button
            className={cn(
              "px-4 py-2 text-sm font-medium",
              tab === item.id
                ? "border-b-2 border-primary text-primary"
                : "text-muted-foreground hover:text-foreground",
            )}
            key={item.id}
            onClick={() => setTab(item.id)}
            type="button"
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === "compensation" ? (
        <EmployeeCompensationPanel
          allowanceComponents={allowanceComponents}
          allowances={allowances}
          compensation={compensation}
          employeeId={employeeId}
        />
      ) : (
        <EmployeeTaxProfilePanel employeeId={employeeId} taxProfile={taxProfile} />
      )}
      </div>
    </PortalSectionCard>
  );
}
